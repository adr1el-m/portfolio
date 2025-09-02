'use strict';

// XSS Protection: Secure HTML sanitization function
function sanitizeHTML(htmlString) {
  // Return empty string if input is not a string
  if (typeof htmlString !== 'string') {
    return '';
  }
  
  // Create a temporary div element
  const temp = document.createElement('div');
  
  // Set the HTML content
  temp.innerHTML = htmlString;
  
  // Remove all script tags and their content
  const scripts = temp.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove all event handlers (onclick, onload, etc.)
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(element => {
    // Remove all event handler attributes
    const attributes = element.attributes;
    for (let i = attributes.length - 1; i >= 0; i--) {
      const attr = attributes[i];
      if (attr.name.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
      // Remove javascript: URLs
      if (attr.value && attr.value.toLowerCase().startsWith('javascript:')) {
        element.removeAttribute(attr.name);
      }
      // Remove data: URLs that could contain scripts
      if (attr.value && attr.value.toLowerCase().startsWith('data:')) {
        element.removeAttribute(attr.name);
      }
    }
  });
  
  return temp.innerHTML;
}

// XSS Protection: Safe HTML insertion function
function safeSetHTML(element, htmlString) {
  if (!element) return;
  
  // For trusted content (like our own templates), we can use innerHTML
  // but we'll sanitize it anyway for extra safety
  const sanitizedHTML = sanitizeHTML(htmlString);
  element.innerHTML = sanitizedHTML;
}

// XSS Protection: Safe text insertion (preferred method)
function safeSetText(element, text) {
  if (!element) return;
  element.textContent = text;
}

// Simple loadingManager stub to prevent errors
const loadingManager = {
  setModalLoading: function(modal, loading) {
    // Simple fallback implementation
    if (loading && modal) {
      modal.style.opacity = '0.7';
    } else if (modal) {
      modal.style.opacity = '1';
    }
  },
  withLoading: async function(operation, options = {}) {
    // Simple fallback - just execute the operation
    try {
      return await operation();
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    }
  }
};

// Make loadingManager globally available
window.loadingManager = loadingManager;

// Achievement modal function
function openAchievementModal(item) {
  // Ensure loadingManager is available (defensive programming)
  if (typeof loadingManager === 'undefined') {
    console.error('loadingManager is not defined, creating fallback');
    window.loadingManager = {
      setModalLoading: function() {},
      withLoading: async function(operation) { return await operation(); }
    };
  }
  
  const achievementModal = document.getElementById('achievementModal');
  const slideImageEl = achievementModal.querySelector('.achievement-slide-image');
  const titleModalEl = achievementModal.querySelector('.achievement-title-modal');
  const descModalEl = achievementModal.querySelector('.achievement-desc-modal');
  const organizerModalEl = achievementModal.querySelector('.achievement-organizer');
  const dateLocationEl = achievementModal.querySelector('.achievement-date-location');

  // Try to fetch an array of images from the "data-images" attribute.
  let imagesData = item.getAttribute('data-images');
  let webpImagesData = item.getAttribute('data-webp-images');
  let imagesArray = [];
  let webpImagesArray = [];
  
  try {
    if (imagesData) {
      imagesArray = JSON.parse(imagesData);
    } else {
      // Fallback: if only a single image is provided using "data-image"
      let singleImage = item.getAttribute('data-image');
      if (singleImage) {
        imagesArray = [singleImage];
      }
    }
    
    if (webpImagesData) {
      webpImagesArray = JSON.parse(webpImagesData);
    }
  } catch (error) {
    console.error("Error parsing achievement images:", error);
    imagesArray = [];
    webpImagesArray = [];
  }

  // Use a fallback image if no images are specified.
  if (imagesArray.length === 0) {
    imagesArray = ['images/default-achievement.jpg'];
  }

  // Always show the first image when the modal is opened.
  window.currentAchievementImages = imagesArray;
  window.currentAchievementWebPImages = webpImagesArray;
  window.currentAchievementImageIndex = 0;
  
  // Use WebP if supported and available
  if (webpImagesArray.length > 0 && document.documentElement.classList.contains('webp')) {
    slideImageEl.src = webpImagesArray[0];
  } else {
    slideImageEl.src = imagesArray[0];
  }

  // Retrieve achievement title and description.
  const achievementTitle = item.querySelector('h4') ? item.querySelector('h4').innerText : "Achievement";
  const achievementDesc = item.getAttribute('data-description') || "";
  
  // Retrieve additional details.
  const organizer = item.getAttribute('data-organizer') || "";
  const date = item.getAttribute('data-date') || "";
  const locationText = item.getAttribute('data-location') || "";
  
  // Format the details with HTML markup so that each appears on its own line with bold labels.
  let detailsHTML = "";
  if (locationText) {
    detailsHTML += `<p><span class="detail-label">Location:</span> ${locationText}</p>`;
  }
  if (date) {
    detailsHTML += `<p><span class="detail-label">Date:</span> ${date}</p>`;
  }
  safeSetHTML(dateLocationEl, detailsHTML);

  // Populate modal fields.
  titleModalEl.innerText = achievementTitle;
  descModalEl.innerText = achievementDesc;
  organizerModalEl.innerText = organizer;

  // Display the modal.
  achievementModal.style.display = "flex";

  // Update slider navigation buttons.
  updateAchievementNavigationButtons();
}

const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }

// Image Optimization and Lazy Loading
class ImageOptimizer {
  constructor() {
    this.lazyImages = [];
    this.imageObserver = null;
    this.init();
  }

  init() {
    this.setupLazyLoading();
    this.setupWebPSupport();
  }

  // Check if browser supports WebP
  supportsWebP() {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  // Setup WebP support detection
  async setupWebPSupport() {
    const supportsWebP = await this.supportsWebP();
    if (supportsWebP) {
      document.documentElement.classList.add('webp');
    } else {
      document.documentElement.classList.add('no-webp');
    }
  }

  // Setup lazy loading for images
  setupLazyLoading() {
    this.lazyImages = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      this.imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      this.lazyImages.forEach(img => {
        this.imageObserver.observe(img);
      });
    } else {
      // Fallback for older browsers
      this.lazyImages.forEach(img => {
        this.loadImage(img);
      });
    }
  }

  // Load individual image with WebP support
  loadImage(img) {
    const src = img.dataset.src;
    const webpSrc = img.dataset.webpSrc;
    
    // Try WebP first if supported and available
    if (webpSrc && document.documentElement.classList.contains('webp')) {
      img.src = webpSrc;
    } else {
      img.src = src;
    }
    
    img.classList.add('loaded');
    img.removeAttribute('data-src');
    img.removeAttribute('data-webp-src');
  }

  // Create responsive image element
  static createResponsiveImage(basePath, alt, sizes = '(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px') {
    const img = document.createElement('img');
    const picture = document.createElement('picture');
    
    // WebP source
    const webpSource = document.createElement('source');
    webpSource.type = 'image/webp';
    webpSource.srcset = `
      ${basePath}-small.webp 400w,
      ${basePath}-medium.webp 800w,
      ${basePath}-large.webp 1200w
    `;
    webpSource.sizes = sizes;
    
    // Fallback source
    const fallbackSource = document.createElement('source');
    fallbackSource.srcset = `
      ${basePath}-small.jpg 400w,
      ${basePath}-medium.jpg 800w,
      ${basePath}-large.jpg 1200w
    `;
    fallbackSource.sizes = sizes;
    
    // Default img element
    img.src = `${basePath}-medium.jpg`;
    img.alt = alt;
    img.loading = 'lazy';
    
    picture.appendChild(webpSource);
    picture.appendChild(fallbackSource);
    picture.appendChild(img);
    
    return picture;
  }
}

// Initialize image optimization
const imageOptimizer = new ImageOptimizer();

const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });

const testimonialsItem = document.querySelectorAll("[data-certifications-item]");
const overlay = document.querySelector("[data-overlay]");

const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-select-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");

select.addEventListener("click", function () { elementToggleFunc(this); });

for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);
  });
}

const filterItems = document.querySelectorAll("[data-filter-item]");

const filterFunc = function (selectedValue) {
  for (let i = 0; i < filterItems.length; i++) {
    if (selectedValue === "all") {
      filterItems[i].classList.add("active");
    } else if (selectedValue === filterItems[i].dataset.category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }
  }
}

let lastClickedBtn = filterBtn[0];

for (let i = 0; i < filterBtn.length; i++) {
  filterBtn[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);
    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;
  });
}

const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }
  });
}

const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {
    for (let i = 0; i < pages.length; i++) {
      if (this.textContent.toLowerCase() === pages[i].dataset.page) {
        pages[i].classList.add("active");
        navigationLinks[i].classList.add("active");
        window.scrollTo(0, 0);
      } else {
        pages[i].classList.remove("active");
        navigationLinks[i].classList.remove("active");
      }
    }
  });
}

/* NEW FAQ Toggle Function
   Instead of toggling display style, we add or remove the "show" class
   so that the CSS transition (slideFadeIn) smoothly animates the answer.
   Make sure the FAQ questions in your HTML call toggleFAQ(this) on click.
*/
window.toggleFAQ = function(element) {
  const answer = element.nextElementSibling;
  answer.classList.toggle("show");
}

/* ===== Scroll Reveal Animation ===== */
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
revealElements.forEach(el => revealObserver.observe(el));

/* ===== Back-to-Top Button Functionality ===== */
const backToTopBtn = document.querySelector('.back-to-top');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    backToTopBtn.classList.add('show');
  } else {
    backToTopBtn.classList.remove('show');
  }
});
backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Theme Toggle Functionality
const themeToggle = document.querySelector("#themeToggle");

function updateThemeIcon() {
  if (document.body.classList.contains("light-mode")) {
    safeSetHTML(themeToggle, '<ion-icon name="moon-outline"></ion-icon>');
  } else {
    safeSetHTML(themeToggle, '<ion-icon name="sunny-outline"></ion-icon>');
  }
}

themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("light-mode");
  updateThemeIcon();
});

// Initialize icon on page load
updateThemeIcon();

/* ===== Chatbot Functionality ===== */
const chatbotBtn = document.querySelector('.chatbot-btn');
const chatbox = document.querySelector('.chatbox');
const closeBtn = document.querySelector('.close-btn');
const messagesDiv = document.querySelector('.chatbox-messages');
const inputField = document.querySelector('.chatbox-input input');
const sendBtn = document.querySelector('.chatbox-input button');

// Toggle chatbox visibility
chatbotBtn.addEventListener('click', () => {
  // Since the inline style may be empty, check for both '' and 'none'
  chatbox.style.display = (chatbox.style.display === 'none' || chatbox.style.display === '') ? 'flex' : 'none';
});

closeBtn.addEventListener('click', () => {
  chatbox.style.display = 'none';
});

// Send message on button click or Enter key
sendBtn.addEventListener('click', handleMessage);
inputField.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleMessage();
  }
});

// Function to format chatbot responses: replace newlines with <br> and **text** with bold
function formatChatbotResponse(text) {
  // Replace all newline characters with <br> for line breaks
  let formatted = text.replace(/\n/g, '<br>');

  // Replace any text wrapped with ** with <strong> tags for bold text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Replace stray single asterisks with a hyphen "-"
  formatted = formatted.replace(/\*/g, '-');

  // If there are no line breaks and the text is long, insert additional line breaks after sentence-ending punctuation
  if (!formatted.includes('<br>') && formatted.length > 300) {
    formatted = formatted.replace(/([.?!])\s+(?=[A-Z])/g, '$1<br><br>');
  }

  return formatted;
}

// Old handleMessage function removed - using enhanced version below

window.addMessage = function(text, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;

  // Use formatted HTML only for bot responses
  if (sender === 'bot') {
    safeSetHTML(messageDiv, formatChatbotResponse(text));
  } else {
    safeSetText(messageDiv, text);
  }
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Smart conversation features
window.addSmartSuggestions = function() {
  const suggestionsContainer = document.querySelector('.chatbox-suggestions');
  if (!suggestionsContainer) return;
  
  const suggestions = [
    "Tell me about Adriel's skills",
    "What projects has he worked on?",
    "How can I contact him?",
    "What's his educational background?",
    "Show me his achievements"
  ];
  
  // Create suggestion buttons safely
  suggestionsContainer.innerHTML = ''; // Clear container
  suggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.className = 'suggestion-btn';
    button.setAttribute('data-suggestion', suggestion);
    safeSetText(button, suggestion);
    suggestionsContainer.appendChild(button);
  });
  
  // Add event listeners to suggestion buttons
  const suggestionButtons = suggestionsContainer.querySelectorAll('.suggestion-btn');
  suggestionButtons.forEach(button => {
    button.addEventListener('click', function() {
      const suggestion = this.getAttribute('data-suggestion');
      console.log('Button clicked with suggestion:', suggestion);
      sendSuggestion(suggestion);
    });
  });
}

// Make sendSuggestion globally accessible
window.sendSuggestion = function(suggestion) {
  console.log('Suggestion clicked:', suggestion);
  const input = document.querySelector('.chatbox-input input');
  if (input) {
    input.value = suggestion;
    console.log('Input value set to:', suggestion);
    // Trigger the message handling
    handleMessage();
  } else {
    console.error('Input field not found');
  }
};

// Enhanced message formatting
function formatMessage(text) {
  // Convert markdown-style formatting to HTML
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// Smart typing indicator with personality
function showTypingIndicator() {
  const messagesContainer = document.querySelector('.chatbox-messages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot-message typing-indicator';
  // Create typing indicator safely
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  const typingDots = document.createElement('div');
  typingDots.className = 'typing-dots';
  
  // Create three dots
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    typingDots.appendChild(span);
  }
  
  const typingText = document.createElement('span');
  typingText.className = 'typing-text';
  safeSetText(typingText, 'AdrAI is thinking...');
  
  messageContent.appendChild(typingDots);
  messageContent.appendChild(typingText);
  typingDiv.appendChild(messageContent);
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return typingDiv;
}

function hideTypingIndicator(typingDiv) {
  if (typingDiv && typingDiv.parentNode) {
    typingDiv.parentNode.removeChild(typingDiv);
  }
}

// Enhanced message handling with smart features
window.handleMessage = async function() {
  const input = document.querySelector('.chatbox-input input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message
  addMessage(message, 'user');
  input.value = '';
  
  // Show typing indicator
  const typingDiv = showTypingIndicator();
  
  // Hide suggestions after user starts typing
  const suggestionsContainer = document.querySelector('.chatbox-suggestions');
  if (suggestionsContainer) {
    suggestionsContainer.style.display = 'none';
  }
  
  try {
    // Get AI response
    const response = await getChatbotResponse(message);
    
    // Hide typing indicator
    hideTypingIndicator(typingDiv);
    
    // Add AI response with formatting
    addMessage(formatMessage(response), 'bot');
    
    // Show suggestions again after response
    setTimeout(() => {
      if (suggestionsContainer) {
        suggestionsContainer.style.display = 'block';
      }
    }, 1000);
    
  } catch (error) {
    hideTypingIndicator(typingDiv);
    addMessage("I'm sorry, I encountered an error. Please try again.", 'bot');
    console.error('Error in handleMessage:', error);
  }
}

// Initialize chatbot with enhanced welcome
window.addEventListener('load', () => {
  // Add smart suggestions container to chatbox
  const chatboxMessages = document.querySelector('.chatbox-messages');
  if (chatboxMessages) {
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'chatbox-suggestions';
    chatboxMessages.appendChild(suggestionsContainer);
  }
  
  // Add welcome message with personality
  setTimeout(() => {
    addMessage("Hello! I'm AdrAI, Adriel's intelligent digital assistant! 🤖✨ I can help you learn about his skills, projects, education, and experience. What would you like to explore?", 'bot');
    addSmartSuggestions();
  }, 500);
});

// Define an enhanced knowledge base about Adriel
const knowledge = {
  personal: {
    name: "Adriel M. Magalona",
    role: "Computer Science Student",
    location: "Taguig City, Metro Manila, Philippines",
    email: "dagsmagalona@gmail.com"
  },
  about: "A university student with a passion for technology and computer science. I love diving into new challenges, picking up new skills along the way, and contributing to innovative projects.",
  technicalSkills: {
    languages: ["C", "C++", "Python", "Visual Basic", "HTML", "Java", "JavaScript", "PHP"],
    librariesFrameworks: ["React", "Bootstrap", "Tailwind CSS", "Axios", "Express", "Cors"],
    databases: ["MySQL"],
    tools: ["Visual Studio Code", "Cursor", "Git", "GitHub", "XAMPP", "NPM", "Vercel", "Vite", "Node.js", "ESLint", "dotenv", "Multer"]
  },
  experience: [
    {
      title: "Senior Front-End Web Developer",
      organization: "PUP Manila Microsoft Student Community",
      period: "October 2024 – Present",
      details: "Collaborated with the front-end team to design interactive layouts for the organization's website and learning materials. Conducted workshops to enhance team skills and knowledge-sharing."
    },
    {
      title: "Layout Committee Chairperson",
      organization: "Information and Communications Technology Society - Higher School ng Umak",
      period: "October 2022 – June 2024",
      details: "Led the design of graphical elements for publication materials, ensuring alignment with organizational vision. Collaborated with the team to brainstorm concepts and communicate key messages through visual design."
    }
  ],
  projects: [
    {
      name: "Online Document Request System",
      technologies: "PHP, XAMPP, HTML, CSS, JavaScript, MySQL",
      date: "September 2024",
      details: "Built a system for processing student document requests with AJAX-powered status updates, file uploads, responsive interfaces, session management, real-time approvals, and robust error handling."
    },
    {
      name: "FinanceWise",
      technologies: "HTML, CSS, JavaScript, Bootstrap, Express, Git",
      date: "January 2025",
      details: "Developed an AI-powered financial advisory platform that delivers personalized recommendations for spending, investments, and loans, helping users make informed financial decisions."
    },
    {
      name: "Excalicode's Data Structures and Algorithms Champion",
      date: "September 2024",
      details: "Organized by The Programmers' Guild at Polytechnic University of the Philippines, where I won the Knight Category in a Data Structures and Algorithms competition."
    },
    {
      name: "Entrepreneurship Educators Association of the Philippines Hackathon",
      date: "September 2024",
      details: "Placed 3rd out of 6 teams after a month-long bootcamp and consulting with UP Diliman professors. Pitched EcoSiklo, a venture repurposing fabric scraps into pet essentials."
    }
  ],
  certifications: [
    {
      body: "Java Object-Oriented Programming Basics Workshop with Microsoft Learn Integration",
      organization: "PUP Manila Microsoft Student Community",
      date: "August 2024"
    },
    {
      body: "Introduction to Microsoft Copilot",
      organization: "PUP Manila Microsoft Student Community",
      date: "August 2024"
    }
  ],
  education: [
    {
      school: "Polytechnic University of the Philippines",
      location: "Manila, Philippines",
      degree: "Bachelor of Science in Computer Science",
      period: "September 2024 – Present",
      details: "Department of Science and Technology (DOST) Undergraduate Scholar, Gawad Pagkilala 2024 Awardee."
    },
    {
      school: "University of Makati",
      location: "Taguig, Philippines",
      degree: "Technical-Vocational and Livelihood Track - Computer Programming",
      period: "September 2022 – June 2024",
      details: "Grades: 97.17 GWA, Consistent Dean's Lister, Graduated: Top 7 overall out of 1,466 students."
    }
  ]
};

// Enhanced AdrAI System with Intelligence Features
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

// Conversation memory and context
let conversationHistory = [];
let userPreferences = {};
let currentContext = {};

// Smart response templates for different scenarios
const responseTemplates = {
  greeting: [
    "Hello! I'm AdrAI, Adriel's digital assistant. How can I help you today? 😊",
    "Hi there! I'm here to help you learn about Adriel and his work. What would you like to know? 🤖",
    "Greetings! I'm AdrAI, your guide to Adriel's portfolio. What interests you most? ✨"
  ],
  followUp: [
    "Would you like to know more about that?",
    "Is there anything specific you'd like to explore further?",
    "Would you like me to elaborate on any particular aspect?",
    "Are you interested in learning about related topics?"
  ],
  clarification: [
    "Could you be more specific about what you'd like to know?",
    "I'd be happy to help! Could you clarify what aspect interests you most?",
    "That's a great question! Could you provide a bit more detail?"
  ]
};

// Enhanced knowledge base with better structure
const enhancedKnowledge = {
  ...knowledge,
  personality: {
    traits: ["helpful", "professional", "friendly", "knowledgeable", "enthusiastic"],
    communication_style: "conversational yet informative",
    expertise_areas: ["web development", "computer science", "project management", "UI/UX design"]
  },
  conversation_starters: [
    "Tell me about Adriel's background",
    "What projects has he worked on?",
    "What are his technical skills?",
    "How can I contact him?",
    "What makes him unique as a developer?"
  ],
  smart_suggestions: {
    after_skills: "Would you like to see examples of his work using these technologies?",
    after_projects: "Interested in the technical details or the impact of these projects?",
    after_education: "Would you like to know about his academic achievements or extracurricular activities?"
  }
};

// Smart context analysis
function analyzeUserIntent(message) {
  const lowerMessage = message.toLowerCase();
  
  const intents = {
    greeting: /^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(message),
    skills: /(skill|technology|programming|language|framework|tool)/i.test(message),
    projects: /(project|work|portfolio|github|repository)/i.test(message),
    education: /(education|school|university|degree|student|academic)/i.test(message),
    contact: /(contact|email|reach|connect|hire)/i.test(message),
    experience: /(experience|job|work|internship|position)/i.test(message),
    personal: /(about|who|background|personal|hobby)/i.test(message),
    help: /(help|what can you do|capabilities)/i.test(message)
  };
  
  return Object.keys(intents).filter(intent => intents[intent]);
}

// Generate smart follow-up questions
function generateFollowUpQuestions(context, userMessage) {
  const intents = analyzeUserIntent(userMessage);
  const suggestions = [];
  
  if (intents.includes('skills')) {
    suggestions.push("Would you like to see examples of projects using these technologies?");
    suggestions.push("Are you interested in learning about his learning journey with these skills?");
  }
  
  if (intents.includes('projects')) {
    suggestions.push("Would you like to know about the technical challenges he faced?");
    suggestions.push("Are you curious about the impact and results of these projects?");
  }
  
  if (intents.includes('education')) {
    suggestions.push("Would you like to know about his academic achievements?");
    suggestions.push("Are you interested in his extracurricular activities and leadership roles?");
  }
  
  if (intents.includes('contact')) {
    suggestions.push("Would you like to know about his availability for projects?");
    suggestions.push("Are you interested in his preferred communication methods?");
  }
  
  return suggestions.length > 0 ? suggestions[Math.floor(Math.random() * suggestions.length)] : null;
}

// Enhanced prompt engineering
function createIntelligentPrompt(userMessage, conversationContext) {
  const intents = analyzeUserIntent(userMessage);
  const currentTime = new Date().toLocaleTimeString();
  
  let systemPrompt = `You are AdrAI, Adriel Magalona's intelligent digital assistant. You are:

PERSONALITY:
- Friendly, professional, and enthusiastic about technology
- Knowledgeable about Adriel's background, skills, and projects
- Helpful and eager to provide detailed, accurate information
- Conversational yet informative in your responses

CONTEXT AWARENESS:
- Current time: ${currentTime}
- User's recent interests: ${intents.join(', ') || 'general inquiry'}
- Conversation history: ${conversationContext.length > 0 ? 'Previous topics discussed' : 'New conversation'}

KNOWLEDGE BASE:
${JSON.stringify(enhancedKnowledge, null, 2)}

RESPONSE GUIDELINES:
1. Be conversational and engaging, not robotic
2. Provide specific, accurate information from the knowledge base
3. Use emojis appropriately to make responses friendly
4. If asked about something not in the knowledge base, be honest about limitations
5. Offer relevant follow-up suggestions when appropriate
6. Keep responses concise but informative (2-4 sentences typically)
7. Use "Adriel" when referring to him, not "he" in every sentence

USER MESSAGE: "${userMessage}"

Respond as AdrAI with personality and intelligence:`;

  return systemPrompt;
}

// Main intelligent response function
async function getChatbotResponse(message) {
  // Check rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
    return "Please wait a moment before sending another message. I'm processing your previous request. ⏳";
  }
  
  lastRequestTime = now;
  
  // Add to conversation history
  conversationHistory.push({
    user: message,
    timestamp: now,
    intents: analyzeUserIntent(message)
  });
  
  // Keep only last 10 messages for context
  if (conversationHistory.length > 10) {
    conversationHistory = conversationHistory.slice(-10);
  }
  
  try {
    const intelligentPrompt = createIntelligentPrompt(message, conversationHistory);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: intelligentPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.8, // Slightly higher for more personality
          maxOutputTokens: 1000, // Increased for more detailed responses
          topP: 0.9,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      let aiResponse = data.candidates[0].content.parts[0].text;
      
      // Add smart follow-up question if appropriate
      const followUp = generateFollowUpQuestions(currentContext, message);
      if (followUp && Math.random() > 0.5) { // 50% chance of adding follow-up
        aiResponse += `\n\n${followUp}`;
      }
      
      // Store the response in conversation history
      conversationHistory[conversationHistory.length - 1].ai = aiResponse;
      
      return aiResponse;
    } else {
      console.error('Unexpected response structure:', data);
      return "I apologize, but I received an unexpected response format. Please try again later.";
    }

  } catch (error) {
    console.error('Chatbot API Error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    
    // Smart error recovery with context-aware messages
    if (error.message.includes('401') || error.message.includes('403')) {
      return "I'm having trouble with my API access. Please check if the API key is valid and has proper permissions. 🔑";
    } else if (error.message.includes('429')) {
      return "I've reached my API usage limit. Please wait a few minutes before trying again. The limit will reset automatically. ⏰";
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      return "I'm having network connectivity issues. Please check your internet connection. 🌐";
    } else {
      // Fallback to smart responses based on conversation context
      const intents = analyzeUserIntent(message);
      if (intents.includes('greeting')) {
        return responseTemplates.greeting[Math.floor(Math.random() * responseTemplates.greeting.length)];
      } else if (intents.includes('help')) {
        return "I'm AdrAI, Adriel's digital assistant! I can tell you about his skills, projects, education, and experience. What would you like to know? 🤖";
      } else {
        return "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again in a moment! 🔄";
      }
    }
  }
}

// Project Modal Functionality

// Get modal elements
const projectModal = document.getElementById('projectModal');
const modalCloseBtn = document.querySelector('.project-modal-close');
const modalPrevBtn = document.querySelector('.project-modal-prev');
const modalNextBtn = document.querySelector('.project-modal-next');
const modalImageEl = document.querySelector('.project-modal-current-image');
const projectGithubLink = document.querySelector('.project-github');
const projectLiveLink = document.querySelector('.project-live');

let currentImageIndex = 0;
let currentProjectImages = [];

// Add event listener to all project eye icons
const projectItems = document.querySelectorAll('.project-item-icon-box');

projectItems.forEach(item => {
  item.addEventListener('click', () => {
    // Retrieve project data from the clicked element's attributes.
    // Expected attributes: data-images (JSON string array), data-github, and data-live.
    let imagesData = item.getAttribute('data-images');
    let githubLink = item.getAttribute('data-github');
    let liveLink = item.getAttribute('data-live');

    // Parse images from the data attribute or set a fallback array
    try {
      currentProjectImages = imagesData ? JSON.parse(imagesData) : [];
    } catch (e) {
      currentProjectImages = [];
    }
    if (!currentProjectImages.length) {
      // Fallback images if none are provided.
      currentProjectImages = ['images/project1.png', 'images/project2.png'];
    }
    
    // Set the links (default to '#' if not provided)
    projectGithubLink.href = githubLink || '#';
    projectLiveLink.href = liveLink || '#';

    // Start with the first image
    currentImageIndex = 0;
    modalImageEl.src = currentProjectImages[currentImageIndex];

    // Open the modal
    projectModal.style.display = 'flex';
  });
});

// Close modal on close button click or when clicking outside content
modalCloseBtn.addEventListener('click', () => {
  projectModal.style.display = 'none';
});
window.addEventListener('click', event => {
  if (event.target === projectModal) {
    projectModal.style.display = 'none';
  }
});

// Navigate to next image
modalNextBtn.addEventListener('click', () => {
  if (currentProjectImages.length) {
    currentImageIndex = (currentImageIndex + 1) % currentProjectImages.length;
    modalImageEl.src = currentProjectImages[currentImageIndex];
  }
});

// Navigate to previous image
modalPrevBtn.addEventListener('click', () => {
  if (currentProjectImages.length) {
    currentImageIndex = (currentImageIndex - 1 + currentProjectImages.length) % currentProjectImages.length;
    modalImageEl.src = currentProjectImages[currentImageIndex];
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Attach click event listener to each achievement item to open modal
  const achievementItems = document.querySelectorAll('.achievements-panel .achievement-item');
  achievementItems.forEach(item => {
    item.addEventListener('click', function() {
      openAchievementModal(this);
    });
  });

  // Updated function for arrow button state (only right arrow is used for forward navigation)
  function updateAchievementNavigationButtons() {
    const achievementModal = document.getElementById('achievementModal');
    const prevBtn = achievementModal.querySelector('.achievement-slider-prev');
    const nextBtn = achievementModal.querySelector('.achievement-slider-next');

    // Enable the left arrow (prevBtn) only if we're not on the first image.
    if (window.currentAchievementImageIndex === 0) {
      prevBtn.classList.add('disabled');
      prevBtn.style.opacity = '0.5';
      prevBtn.style.pointerEvents = 'none';
    } else {
      prevBtn.classList.remove('disabled');
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
    }

    // Enable the right arrow (nextBtn) only if we're not on the last image.
    if (window.currentAchievementImageIndex === window.currentAchievementImages.length - 1) {
      nextBtn.classList.add('disabled');
      nextBtn.style.opacity = '0.5';
      nextBtn.style.pointerEvents = 'none';
    } else {
      nextBtn.classList.remove('disabled');
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    }
  }

  // Set up event listeners for both arrow buttons after the DOM content is fully loaded.
  const achievementModal = document.getElementById('achievementModal');
  const prevBtn = achievementModal.querySelector('.achievement-slider-prev');
  const nextBtn = achievementModal.querySelector('.achievement-slider-next');

  // Listener for the left arrow: Navigate to the previous image.
  prevBtn.addEventListener('click', () => {
    if (window.currentAchievementImageIndex > 0) {
      window.currentAchievementImageIndex--;
      const slideImageEl = achievementModal.querySelector('.achievement-slide-image');
      
      // Use WebP if supported and available
      if (window.currentAchievementWebPImages && window.currentAchievementWebPImages.length > 0 && 
          document.documentElement.classList.contains('webp')) {
        slideImageEl.src = window.currentAchievementWebPImages[window.currentAchievementImageIndex];
      } else {
        slideImageEl.src = window.currentAchievementImages[window.currentAchievementImageIndex];
      }
      
      updateAchievementNavigationButtons();
    }
  });

  // Listener for the right arrow: Navigate to the next image.
  nextBtn.addEventListener('click', () => {
    if (window.currentAchievementImageIndex < window.currentAchievementImages.length - 1) {
      window.currentAchievementImageIndex++;
      const slideImageEl = achievementModal.querySelector('.achievement-slide-image');
      
      // Use WebP if supported and available
      if (window.currentAchievementWebPImages && window.currentAchievementWebPImages.length > 0 && 
          document.documentElement.classList.contains('webp')) {
        slideImageEl.src = window.currentAchievementWebPImages[window.currentAchievementImageIndex];
      } else {
        slideImageEl.src = window.currentAchievementImages[window.currentAchievementImageIndex];
      }
      
      updateAchievementNavigationButtons();
    }
  });

  // Achievement modal close functionality
  const achievementModalClose = achievementModal.querySelector('.achievement-modal-close');

  achievementModalClose.addEventListener('click', () => {
    achievementModal.style.display = 'none';
  });

  achievementModal.addEventListener('click', (e) => {
    if (e.target === achievementModal) {
      achievementModal.style.display = 'none';
    }
  });
});

// Make sure the function is available globally for inline onclick calls.
window.openAchievementModal = openAchievementModal;
