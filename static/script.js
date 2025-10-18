const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const submitButton = chatForm.querySelector('button[type="submit"]');

/**
 * Adds a message to the chat box UI.
 * @param {string} text - The message text.
 * @param {('user'|'bot')} sender - The sender of the message.
 * @returns {HTMLElement} The created message element.
 */
function appendMessage(sender, text) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", `${sender}-message`);
  messageElement.textContent = text;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
  return messageElement;
}

/**
 * Sets the UI to a loading state, disabling the form.
 * @param {boolean} isLoading - Whether the app is in a loading state.
 */
function setFormLoadingState(isLoading) {
  submitButton.disabled = isLoading;
  userInput.disabled = isLoading;
  userInput.placeholder = isLoading ? "Thinking..." : "Type your message...";
}

/**
 * Handles the form submission to send a message to the backend.
 * @param {Event} event - The form submission event.
 */
async function handleChatSubmit(event) {
  event.preventDefault();
  const userText = userInput.value.trim();

  if (!userText) {
    return;
  }

  // 1. Add user message and clear input
  appendMessage("user", userText);
  userInput.value = "";

  // 2. Show "Thinking..." message and disable form
  setFormLoadingState(true);
  const thinkingMessage = appendMessage("bot", "Thinking...");

  try {
    // 3. Send message to the backend API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: userText }],
      }),
    });

    if (!response.ok) {
      // Handle HTTP errors like 404 or 500
      throw new Error("Failed to get response from server.");
    }

    const data = await response.json();

    // 4. Replace "Thinking..." with the actual response
    if (data && data.result) {
      thinkingMessage.textContent = data.result;
    } else {
      // Handle cases where the response is ok, but no result is found
      thinkingMessage.textContent = "Sorry, no response received.";
    }
  } catch (error) {
    // 5. Handle fetch errors or other exceptions
    console.error("Error fetching chat response:", error);
    thinkingMessage.textContent =
      error.message || "An unexpected error occurred.";
    thinkingMessage.classList.add("error-message");
  } finally {
    // 6. Re-enable the form
    setFormLoadingState(false);
    userInput.focus();
  }
}

chatForm.addEventListener("submit", handleChatSubmit);