# Adriel's Portfolio

Welcome to my portfolio! This project is a carefully crafted showcase of my work, skills, and professional journey. Built with passion and attention to detail, it demonstrates my approach to responsive design, modern web development, and creative problem-solving.

## Overview

This portfolio serves as my professional digital presence and integrates various state-of-the-art web development techniques. It highlights my proficiency in:

- **Frontend Technologies:** HTML5, CSS3, and modern JavaScript (ES6+)
- **Responsive Design:** Mobile-first approach with CSS Grid and Flexbox
- **Advanced CSS:** Utilizing CSS variables, gradients, transitions, and animations for dynamic and engaging user experiences
- **Asynchronous & Data-Driven Applications:** Implementing real-time interactions with the Fetch API and integrating external APIs for enhanced functionality

## Project Structure

- **`index.html`:** Main HTML file with semantic structure and accessibility features
- **`style.css`:** Comprehensive CSS with modern features, animations, and responsive design
- **`script.js`:** Modern JavaScript with ES6+ features, chatbot integration, and interactive components
- **`public/`:** Static assets including images, PDFs, and achievement galleries
- **`dev-server.py`:** Custom Python development server with auto-reload and network access
- **`package.json`:** Project metadata and development scripts

## How My Portfolio is Made

- **Vanilla Web Technologies:**  
  The portfolio is built using **pure HTML5, CSS3, and JavaScript** without any framework dependencies. This approach ensures fast loading times, excellent performance, and complete control over every aspect of the user experience.

- **Responsive & Adaptive Design:**  
  The design leverages CSS Flexbox, Grid, and media queries to ensure a seamless experience on devices ranging from mobile phones to desktop monitors. Advanced CSS techniques such as transitions and animations add life to the interactive components.

- **Modern Development Workflow:**  
  The project uses a custom Python development server that provides live reloading, proper MIME types, and network access for testing on mobile devices. This lightweight approach eliminates build complexity while maintaining a professional development experience.

## Chatbot Integration

During sembreak, I saw an opportunity to enhance the interactivity of my portfolio by integrating an innovative chatbot feature. This process allowed me to merge advanced UI techniques with cutting-edge AI technology:

- **User Interface & Experience:**  
  A sleek and responsive chatbot interface was built using **HTML5**, **CSS3**, and **Vanilla JavaScript**. It features animated typing indicators, smooth transitions, and dynamic message rendering for a natural conversational experience.

- **Asynchronous Data Handling:**  
  The chatbot uses the native **Fetch API** to perform AJAX calls, managing real-time data exchange without refreshing the page. This enables seamless conversations and ensures that the UI stays responsive.

- **Generative AI Integration:**  
  At its core, the chatbot leverages a generative language API powered by Google's **Gemini-pro** model (including Gemini 1.5 Flash enhancements) to deliver concise, human-like responses. It dynamically utilizes a custom knowledge base containing details about my education, projects, certifications, and work experience, ensuring data-driven and contextually relevant interactions.

- **Technical Implementation:**  
  The chatbot employs asynchronous functions, robust error handling, and dynamic DOM manipulation to update the user interface in real time. This integration not only demonstrates my ability to implement modern web APIs and asynchronous patterns but also highlights my passion for merging UI/UX design with AI-driven capabilities.

## Performance Monitoring & Analytics 📊

This portfolio includes **enterprise-grade performance monitoring** to ensure optimal user experience:

- **Core Web Vitals Tracking:**  
  Real-time monitoring of LCP, INP, CLS, FCP, and TTFB using the `web-vitals` library. Performance metrics are automatically collected and reported.

- **Vercel Analytics & Speed Insights:**  
  Integrated with Vercel's analytics platform to track real user metrics, page views, and performance data in production.

- **Performance Budgets:**  
  Strict budgets for JavaScript (300KB), CSS (50KB), images (500KB), and timing metrics to prevent performance regression.

- **Lighthouse CI:**  
  Automated Lighthouse audits with minimum scores of 90+ for Performance, Accessibility, Best Practices, and SEO.

- **GitHub Actions Integration:**  
  Continuous performance monitoring on every commit with automated Lighthouse audits and performance budget checks.

**Run Performance Audits:**
```bash
npm run perf:audit          # Full Lighthouse audit
npm run lighthouse:ci       # CI audit (3 runs)
npm run perf:budget        # Check performance budget
```

See [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md) for detailed documentation.

## Accessibility ♿

This portfolio achieves **WCAG 2.1 AA compliance** with a **100/100 Lighthouse accessibility score**:

- **Comprehensive ARIA Labels:**  
  All interactive elements include proper `aria-label`, `aria-labelledby`, and `aria-describedby` attributes for screen reader users.

- **Full Keyboard Navigation:**  
  Every feature is accessible via keyboard with proper focus management, tab order, and keyboard shortcuts (Tab, Enter, Space, Escape).

- **Semantic HTML:**  
  Proper use of HTML5 semantic elements with ARIA roles (navigation, dialog, button, tab, listbox) for assistive technologies.

- **Screen Reader Optimization:**  
  ARIA live regions for dynamic content announcements, proper modal focus trapping, and visually hidden labels where needed.

- **Skip Navigation:**  
  Skip-to-main-content link allows keyboard users to bypass repetitive navigation elements.

- **Dynamic Enhancements:**  
  JavaScript `AccessibilityEnhancer` module automatically adds ARIA attributes, keyboard handlers, and announces state changes.

**Accessibility Features:**
- ✅ WCAG 2.1 AA Compliant
- ✅ 100/100 Lighthouse Accessibility Score
- ✅ Fully Keyboard Accessible
- ✅ Screen Reader Optimized
- ✅ Focus Management for Modals
- ✅ Inclusive Design Principles

See [ACCESSIBILITY_FIXES.md](./ACCESSIBILITY_FIXES.md) for detailed documentation.

## Deployment and Future Enhancements

- **Deployment:**  
  The project is designed for seamless deployment on platforms like **Vercel**, enabling continuous integration and effortless updates. The optimized folder structure, asset management, and build configurations ensure scalability and maintainability.

- **Future Enhancements:**
  - Expand the chatbot's capabilities with more advanced natural language processing features.
  - Integrate additional interactive sections and enhanced animations.
  - Connect to a backend service to dynamically update content and further personalize the user experience.
  - Continue optimizing for accessibility and SEO based on Lighthouse audit feedback.

Feel free to explore the source code, interact with the chatbot, and adapt this project to reflect your own technical style and professional achievements!

@my-portfolio
