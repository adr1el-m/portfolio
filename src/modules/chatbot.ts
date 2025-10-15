import type { ChatMessage } from '@/types';

/**
 * Chatbot Manager Module
 * Handles the chatbot functionality.
 */
export class ChatbotManager {
  private messages: ChatMessage[] = [];
  private chatbox: HTMLElement | null;
  private chatbotBtn: HTMLElement | null;
  private closeBtn: HTMLElement | null;
  private messagesContainer: HTMLElement | null;
  private inputField: HTMLInputElement | null;
  private sendButton: HTMLElement | null;

  constructor() {
    this.chatbox = document.querySelector('.chatbox');
    this.chatbotBtn = document.querySelector('.chatbot-btn');
    this.closeBtn = document.querySelector('.close-btn');
    this.messagesContainer = document.querySelector('.chatbox-messages');
    this.inputField = document.querySelector('.chatbox-input input') as HTMLInputElement;
    this.sendButton = document.querySelector('.chatbox-input button');

    this.initializeEventListeners();
    this.displayWelcomeMessage();
    console.log('ChatbotManager initialized');
  }

  private initializeEventListeners(): void {
    if (this.chatbotBtn && this.chatbox) {
      this.chatbotBtn.addEventListener('click', () => this.toggleChatbox());
    }
    if (this.closeBtn && this.chatbox) {
      this.closeBtn.addEventListener('click', () => this.toggleChatbox());
    }
    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => this.sendMessage());
    }
    if (this.inputField) {
      this.inputField.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    }
  }

  private toggleChatbox(): void {
    if (this.chatbox) {
      this.chatbox.classList.toggle('active');
    }
  }

  private displayWelcomeMessage(): void {
    const welcomeMessage = "👋 Hi! I'm AdrAI, Adriel's AI assistant. I can help you learn more about his skills, projects, and experience. What would you like to know?";
    this.addMessage(welcomeMessage, 'bot');
  }

  private sendMessage(): void {
    if (!this.inputField || !this.inputField.value.trim()) return;

    const userMessage = this.inputField.value.trim();
    this.addMessage(userMessage, 'user');
    this.inputField.value = '';

    // Show typing indicator
    this.showTypingIndicator();

    // Simulate bot response with a delay
    setTimeout(() => {
      this.hideTypingIndicator();
      this.handleMessage(userMessage);
    }, 1000 + Math.random() * 1000);
  }

  private showTypingIndicator(): void {
    if (!this.messagesContainer) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  private hideTypingIndicator(): void {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  public addMessage(text: string, sender: 'user' | 'bot'): void {
    const message: ChatMessage = {
      role: sender,
      content: text,
      timestamp: new Date(),
    };
    this.messages.push(message);
    this.displayMessage(text, sender);
  }

  private displayMessage(text: string, sender: 'user' | 'bot'): void {
    if (!this.messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'bot-message'}`;
    messageDiv.textContent = text;
    
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  private handleMessage(userMessage: string): void {
    // Simple pattern matching for demo purposes
    const message = userMessage.toLowerCase();
    let botResponse = '';

    if (message.includes('project') || message.includes('work')) {
      botResponse = "Adriel has worked on various projects including web applications, AI integrations, and hackathon-winning solutions. Check out the Projects section to see his full portfolio!";
    } else if (message.includes('skill') || message.includes('technology') || message.includes('tech')) {
      botResponse = "Adriel specializes in Web Development, UI/UX Design, Database Management, and AI Integration. He's proficient in TypeScript, Python, React, and many other modern technologies.";
    } else if (message.includes('education') || message.includes('school') || message.includes('university')) {
      botResponse = "Adriel is currently pursuing Computer Science at Polytechnic University of the Philippines (2024-2028). He also studied TVL Programming at University of Makati.";
    } else if (message.includes('award') || message.includes('achievement') || message.includes('win')) {
      botResponse = "Adriel has won multiple hackathons and competitions! He placed 1st in Technovation Summit 2025, 3rd in BPI DataWave 2025, and has many other achievements. Check the About section for the full list!";
    } else if (message.includes('contact') || message.includes('email') || message.includes('reach')) {
      botResponse = "You can reach Adriel at dagsmagalona@gmail.com or connect on LinkedIn, GitHub, or other social platforms. Check the sidebar for all contact links!";
    } else if (message.includes('experience') || message.includes('intern')) {
      botResponse = "Adriel is currently an intern at exkwelabs, where he's gaining hands-on experience in software development and working on innovative projects.";
    } else if (message.includes('scholarship')) {
      botResponse = "Adriel is a DOST-SEI Scholar under RA 7687 and a MACEMCO Scholar, recognizing his academic excellence and commitment to science and technology.";
    } else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      botResponse = "Hello! 👋 I'm here to help you learn more about Adriel. Feel free to ask about his projects, skills, education, or achievements!";
    } else if (message.includes('thank') || message.includes('thanks')) {
      botResponse = "You're welcome! Is there anything else you'd like to know about Adriel?";
    } else {
      botResponse = "That's an interesting question! You can explore different sections of the portfolio to learn more about Adriel's projects, background, skills, and achievements. Or feel free to ask me something specific!";
    }

    this.addMessage(botResponse, 'bot');
  }
}
