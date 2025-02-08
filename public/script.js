'use strict';

// Achievement modal function
function openAchievementModal(item) {
  const achievementModal = document.getElementById('achievementModal');
  const slideImageEl = achievementModal.querySelector('.achievement-slide-image');
  const titleModalEl = achievementModal.querySelector('.achievement-title-modal');
  const descModalEl = achievementModal.querySelector('.achievement-desc-modal');
  const organizerModalEl = achievementModal.querySelector('.achievement-organizer');
  const dateLocationEl = achievementModal.querySelector('.achievement-date-location');

  // Try to fetch an array of images from the "data-images" attribute.
  let imagesData = item.getAttribute('data-images');
  let imagesArray = [];
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
  } catch (error) {
    console.error("Error parsing achievement images:", error);
    imagesArray = [];
  }

  // Use a fallback image if no images are specified.
  if (imagesArray.length === 0) {
    imagesArray = ['images/default-achievement.jpg'];
  }

  // Always show the first image when the modal is opened.
  window.currentAchievementImages = imagesArray;
  window.currentAchievementImageIndex = 0;
  slideImageEl.src = window.currentAchievementImages[0];

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
  dateLocationEl.innerHTML = detailsHTML;

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
      if (this.innerHTML.toLowerCase() === pages[i].dataset.page) {
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
    themeToggle.innerHTML = '<ion-icon name="moon-outline"></ion-icon>';
  } else {
    themeToggle.innerHTML = '<ion-icon name="sunny-outline"></ion-icon>';
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

async function handleMessage() {
  const message = inputField.value.trim();
  if (!message) return;

  // Add user message
  addMessage(message, 'user');
  inputField.value = '';

  // Show typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot-message typing-indicator';
  typingDiv.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  messagesDiv.appendChild(typingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Get and display bot response
  setTimeout(async () => {
    const response = await getChatbotResponse(message);
    typingDiv.remove();
    addMessage(response, 'bot');
  }, 1000);
}

function addMessage(text, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  messageDiv.textContent = text;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Initialize with welcome message
window.addEventListener('load', () => {
  addMessage("Hi! I'm AdrAI, Adriel's digital assistant. How can I help you today?", 'bot');
});

// Define knowledge base about Adriel
const knowledge = {
  personal: {
    name: "Adriel Magalona",
    role: "Computer Science Student",
    location: "Taguig City, Metro Manila, Philippines",
    email: "dagsmagalona@gmail.com"
  },
  about: "A university student with a passion for technology and computer science. I love diving into new challenges and picking up new skills along the way. Whether it's coding, problem-solving, or exploring the latest tech trends, I'm always eager to learn and grow.",
  skills: [
    "Web Development",
    "Database Administration",
    "Graphic Designing",
    "UI/UX Design"
  ],
  education: [
    {
      school: "Polytechnic University of the Philippines",
      period: "2024 — 2028",
      details: "Computer Science program"
    },
    {
      school: "University of Makati",
      period: "2022 — 2024",
      details: "Computer Programming track under TVL strand"
    }
  ],
  organizations: [
    "Google Developer Student Clubs - PUP",
    "AWS Cloud Club PUP",
    "PUP Manila Microsoft Student Community",
    "PUP The Programmers' Guild",
    "Junior Blockchain Education Consortium of the Philippines - PUP Manila"
  ]
};

async function getChatbotResponse(message) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=AIzaSyDr-mS0aSHgcapEfJ5oNSaoiD4jyLqUZNA`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are AdrAI, Adriel Magalona's digital assistant. Here is information about Adriel: ${JSON.stringify(knowledge)}. 
Please provide a natural, conversational response to this question: ${message}`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Error:', error);
    return "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again in a moment! 🔄";
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
      slideImageEl.src = window.currentAchievementImages[window.currentAchievementImageIndex];
      updateAchievementNavigationButtons();
    }
  });

  // Listener for the right arrow: Navigate to the next image.
  nextBtn.addEventListener('click', () => {
    if (window.currentAchievementImageIndex < window.currentAchievementImages.length - 1) {
      window.currentAchievementImageIndex++;
      const slideImageEl = achievementModal.querySelector('.achievement-slide-image');
      slideImageEl.src = window.currentAchievementImages[window.currentAchievementImageIndex];
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

