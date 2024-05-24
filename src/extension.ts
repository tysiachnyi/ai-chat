import { ExtensionContext, commands, window, ViewColumn } from "vscode";
import ollama from "ollama";

export function activate(context: ExtensionContext) {
  // Define a type for messages
  type Message = {
    role: string;
    content: string;
  };

  // Initialize an array to store the messages
  let messages: Message[] = [];

  context.subscriptions.push(
    commands.registerCommand("extension.startChat", () => {
      const panel = window.createWebviewPanel(
        "chatWithAI",
        "Chat with AI",
        ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      // Set initial HTML content for the webview
      panel.webview.html = getWebviewContent();

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case "sendMessage":
              const userMessage: Message = {
                role: "user",
                content: message.text,
              };
              messages.push(userMessage);
              panel.webview.postMessage({
                command: "showResponse",
                text: `User: ${userMessage.content}`,
              });

              const response = await sendMessageToAI(messages);
              messages.push(response);
              panel.webview.postMessage({
                command: "showResponse",
                text: `Assistant: ${response.content}`,
              });
              return;
          }
        },
        undefined,
        context.subscriptions
      );
    })
  );
}

function getWebviewContent() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chat with AI</title>
      <style>
        :root {
          --vscode-foreground: var(--vscode-foreground);
          --vscode-background: var(--vscode-editor-background);
          --vscode-textarea-background: var(--vscode-input-background);
          --vscode-textarea-foreground: var(--vscode-input-foreground);
          --vscode-button-background: var(--vscode-button-background);
          --vscode-button-foreground: var(--vscode-button-foreground);
          --vscode-border: var(--vscode-editorGroup-border);
          --vscode-card-background: var(--vscode-sideBar-background);
          --vscode-card-border-radius: 5px;
        }

        body {
          font-family: var(--vscode-font-family);
          margin: 0;
          padding: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--vscode-background);
          color: var(--vscode-foreground);
        }
        #output {
          flex: 1;
          padding: 10px;
          border-top: 1px solid var(--vscode-border);
          overflow-y: auto;
          background-color: var(--vscode-background);
        }
        #input-section {
          display: flex;
          flex-direction: row;
          border-top: 1px solid var(--vscode-border);
          padding: 10px;
          background-color: var(--vscode-background);
        }
        #input {
          flex: 1;
          padding: 10px;
          font-size: 16px;
          background-color: var(--vscode-textarea-background);
          color: var(--vscode-textarea-foreground);
          border: 1px solid var(--vscode-border);
        }
        button {
          margin-left: 10px;
          padding: 10px;
          font-size: 16px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
        }
        button:hover {
          opacity: 0.8;
        }
        .message-card {
          background-color: var(--vscode-card-background);
          border-radius: var(--vscode-card-border-radius);
          padding: 10px;
          margin: 10px 0;
          border: 1px solid var(--vscode-border);
        }
        .message-user {
          text-align: left;
        }
        .message-assistant {
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div id="output"></div>
      <div id="input-section">
        <textarea id="input" rows="2"></textarea>
        <button onclick="sendMessage()">Send</button>
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        function sendMessage() {
          const input = document.getElementById('input').value;
          vscode.postMessage({
            command: 'sendMessage',
            text: input
          });
          document.getElementById('input').value = '';
        }

        window.addEventListener('message', event => {
          const message = event.data;
          const outputDiv = document.getElementById('output');
          const messageElement = document.createElement('div');
          messageElement.textContent = message.text;
          messageElement.className = 'message-card';
          if (message.text.startsWith('User:')) {
            messageElement.classList.add('message-user');
          } else if (message.text.startsWith('Assistant:')) {
            messageElement.classList.add('message-assistant');
          }
          outputDiv.appendChild(messageElement);
          outputDiv.scrollTop = outputDiv.scrollHeight; // Scroll to the bottom
        });
      </script>
    </body>
    </html>
  `;
}

async function sendMessageToAI(messages: any): Promise<any> {
  console.log("messages", messages);

  try {
    const response = await ollama.chat({
      model: "llama3",
      messages: messages,
    });
    return response.message;
  } catch (error) {
    return {
      role: "assistant",
      content: "Error: Unable to reach the AI service",
    };
  }
}

export function deactivate() {}
