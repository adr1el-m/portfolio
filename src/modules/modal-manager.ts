import type { AchievementData, ProjectData } from '@/types';
import { logger } from '@/config';
import { SecurityManager } from '@/modules/security';

/**
 * Modal Manager Module
 * Handles modal dialogs for projects and achievements.
 */
export class ModalManager {
  private modalEl: HTMLElement | null = null;
  private imgEl: HTMLImageElement | null = null;
  private achievementSourceWebpEl: HTMLSourceElement | null = null;
  private achievementSourceJpegEl: HTMLSourceElement | null = null;
  private projectSourceWebpEl: HTMLSourceElement | null = null;
  private projectSourceJpegEl: HTMLSourceElement | null = null;
  private titleEl: HTMLElement | null = null;
  private organizerEl: HTMLElement | null = null;
  private dateLocEl: HTMLElement | null = null;
  private images: string[] = [];
  private currentIndex = 0;
  private achievementWebpImages: string[] = [];
  private achievementJpegImages: string[] = [];
  private projectWebpImages: string[] = [];
  private projectJpegImages: string[] = [];

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const achievementCards = document.querySelectorAll('.achievement-card');
    logger.log('Found achievement cards:', achievementCards.length);
    
    achievementCards.forEach(card => {
      card.addEventListener('click', () => {
        logger.log('Achievement card clicked!');
        const achievementData = this.getAchievementData(card as HTMLElement);
        logger.log('Achievement data:', achievementData);
        if (achievementData) {
          this.openAchievementModal(achievementData);
        }
      });
    });

    // Setup project eye icon clicks
    const projectItems = document.querySelectorAll('.project-item');
    logger.log('Found project items:', projectItems.length);
    
    projectItems.forEach(item => {
      const eyeIcon = item.querySelector('.project-item-icon-box');
      if (eyeIcon) {
        eyeIcon.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          logger.log('Project eye icon clicked!');
          const projectData = this.getProjectData(item as HTMLElement);
          logger.log('Project data:', projectData);
          if (projectData) {
            this.openProjectModal(projectData);
          }
        });
      }
    });

    // Make the entire project card anchor act as a button trigger without fake navigation
    projectItems.forEach(item => {
      const trigger = item.querySelector('a[href="#"]') as HTMLAnchorElement | null;
      if (!trigger) return;

      // Improve semantics for assistive technologies
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', 'projectModal');
      const projectTitle = item.querySelector('.project-title')?.textContent?.trim();
      trigger.setAttribute('aria-label', projectTitle ? `View details for ${projectTitle}` : 'View project details');

      // Resolve placeholder href to a meaningful destination for SEO
      const liveUrl = (item as HTMLElement).getAttribute('data-live')?.trim() || '';
      const githubUrl = (item as HTMLElement).getAttribute('data-github')?.trim() || '';
      const isHttp = (u: string) => /^https?:\/\//i.test(u);
      let canonicalHref = '#projects';
      if (isHttp(liveUrl)) {
        canonicalHref = liveUrl;
      } else if (isHttp(githubUrl)) {
        canonicalHref = githubUrl;
      }
      trigger.setAttribute('href', canonicalHref);
      if (isHttp(canonicalHref)) {
        trigger.setAttribute('target', '_blank');
        trigger.setAttribute('rel', 'noopener noreferrer');
      }

      const openFromTrigger = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const projectData = this.getProjectData(item as HTMLElement);
        if (projectData) {
          this.openProjectModal(projectData);
        }
      };

      trigger.addEventListener('click', openFromTrigger);
      trigger.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFromTrigger(e);
        }
      });
    });

    // Cache achievement modal elements
    this.modalEl = document.getElementById('achievementModal');
    this.imgEl = document.querySelector('.achievement-slide-image');
    this.achievementSourceWebpEl = document.querySelector('.achievement-image-webp');
    this.achievementSourceJpegEl = document.querySelector('.achievement-image-jpeg');
    this.titleEl = document.querySelector('.achievement-title-modal');
    this.organizerEl = document.querySelector('.achievement-organizer');
    this.dateLocEl = document.querySelector('.achievement-date-location');

    // Achievement modal close button
    const achievementCloseBtn = document.querySelector('.achievement-modal-close');
    achievementCloseBtn?.addEventListener('click', () => this.closeAchievementModal());
    
    // Achievement modal backdrop click
    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.closeAchievementModal();
      }
    });
    
    // Achievement modal Prev/Next
    document.querySelector('.achievement-slider-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateAchievementPrevious();
    });
    document.querySelector('.achievement-slider-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateAchievementNext();
    });

    // Setup project modal event listeners
    this.setupProjectModalListeners();
  }

  private setupProjectModalListeners(): void {
    const projectModal = document.getElementById('projectModal');
    const projectCloseBtn = document.querySelector('.project-modal-close');
    const projectPrevBtn = document.querySelector('.project-gallery-prev');
    const projectNextBtn = document.querySelector('.project-gallery-next');

    // Project modal close button
    projectCloseBtn?.addEventListener('click', () => this.closeProjectModal());
    
    // Project modal backdrop click
    projectModal?.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        this.closeProjectModal();
      }
    });

    // Project modal Previous button
    projectPrevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateProjectPrevious();
    });

    // Project modal Next button
    projectNextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateProjectNext();
    });
  }

  private getAchievementData(element: HTMLElement): AchievementData | null {
    const title = element.querySelector('.card-title')?.textContent || '';
    const imagesStr = element.getAttribute('data-images') || '[]';
    const webpImagesStr = element.getAttribute('data-webp-images') || '[]';
    const organizer = element.getAttribute('data-organizer') || '';
    const date = element.getAttribute('data-date') || '';
    const location = element.getAttribute('data-location') || '';
    const teammatesStr = element.getAttribute('data-teammates') || '[]';
    const githubUrl = element.getAttribute('data-github') || '';
    const description = element.getAttribute('data-description') || '';
    const projectTitle = element.getAttribute('data-project-title') || '';

    try {
      const images = JSON.parse(imagesStr);
      const webpImages = JSON.parse(webpImagesStr);
      const teammates = JSON.parse(teammatesStr);
      
      return {
        title,
        images,
        webpImages,
        organizer,
        date,
        location,
        teammates: teammates.length > 0 ? teammates : undefined,
        githubUrl: githubUrl || undefined,
        description: description || undefined,
        projectTitle: projectTitle || undefined,
      };
    } catch (e) {
      logger.error('Error parsing achievement data:', e);
      return null;
    }
  }

  public openAchievementModal(data: AchievementData): void {
    logger.log('Opening achievement modal with data:', data);
    
    // Ensure ARIA linkage between modal and title
    if (this.titleEl && !this.titleEl.id) {
      this.titleEl.id = 'achievement-modal-title';
    }
    if (this.modalEl) {
      this.modalEl.setAttribute('aria-labelledby', this.titleEl?.id || 'achievement-modal-title');
      this.modalEl.setAttribute('aria-hidden', 'false');
    }

    // Use WebP if supported, fallback to regular images
    const supportsWebp = document.documentElement.classList.contains('webp');
    this.achievementWebpImages = (data.webpImages || []).filter((p) => p.endsWith('.webp') || p.endsWith('.avif'));
    this.achievementJpegImages = (data.images || []);
    this.images = supportsWebp && this.achievementWebpImages.length > 0 ? this.achievementWebpImages : this.achievementJpegImages;
    this.currentIndex = 0;

    logger.log('Modal element:', this.modalEl);
    logger.log('Images to display:', this.images);

    if (this.titleEl) this.titleEl.textContent = data.title;
    if (this.organizerEl) this.organizerEl.textContent = data.organizer;
    if (this.dateLocEl) this.dateLocEl.textContent = `${data.date}${data.location ? ' • ' + data.location : ''}`;

    // New: add description content if present
    const descriptionEl = document.querySelector('.achievement-description') as HTMLElement;
    if (descriptionEl) {
      descriptionEl.textContent = data.description || '';
      descriptionEl.style.display = data.description ? '' : 'none';
    }

    // New: render a related project button when projectTitle is available
    const infoSection = document.querySelector('.achievement-info') as HTMLElement;
    if (infoSection) {
      const existing = infoSection.querySelector('.related-project-button');
      if (existing) existing.remove();

      if (data.projectTitle) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'related-project-button';
        btn.textContent = `View project: ${data.projectTitle}`;
        btn.addEventListener('click', () => {
          const items = document.querySelectorAll('.project-item');
          let target: HTMLElement | null = null;
          items.forEach((item) => {
            const t = item.querySelector('.project-title')?.textContent?.trim();
            if (t === data.projectTitle) target = item as HTMLElement;
          });

          if (target) {
            const pd = this.getProjectData(target);
            if (pd) {
              // Close achievement modal before opening the project modal
              this.closeAchievementModal();
              this.openProjectModal(pd);
            }
          } else {
            logger.warn(`Project "${data.projectTitle}" not found in list.`);
          }
        });
        // Insert after the details block for better context
        const detailsBlock = infoSection.querySelector('.achievement-details');
        if (detailsBlock && detailsBlock.parentElement) {
          detailsBlock.parentElement.insertBefore(btn, detailsBlock.nextSibling);
        } else {
          infoSection.appendChild(btn);
        }
      }
    }

    // Handle teammates section
    this.displayTeammates(data.teammates);

    // Handle GitHub button (fallback to related project's GitHub if missing)
    {
      let gh = data.githubUrl;
      if (!gh && data.projectTitle) {
        const items = document.querySelectorAll('.project-item');
        items.forEach((item) => {
          const t = item.querySelector('.project-title')?.textContent?.trim();
          if (!gh && t === data.projectTitle) {
            // Prefer attribute directly to avoid parsing entire project data
            gh = (item as HTMLElement).getAttribute('data-github') || '';
            if (!gh) {
              const pd = this.getProjectData(item as HTMLElement);
              gh = pd?.githubUrl || '';
            }
          }
        });
      }
      this.displayGithubButton(gh || undefined);
    }

    const mediaSection = document.querySelector('.achievement-media') as HTMLElement;
    const sliderControls = document.querySelector('.achievement-slider-controls') as HTMLElement;
    const sliderContainer = document.querySelector('.achievement-slider') as HTMLElement;

    // Ensure the image container is clean from any previous error/skeleton overlays
    if (sliderContainer) {
      const errorPlaceholder = sliderContainer.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
      const loadingSkeleton = sliderContainer.querySelector('.image-loading-skeleton');
      if (loadingSkeleton) loadingSkeleton.remove();
      const globalSkeleton = sliderContainer.querySelector('.image-skeleton');
      if (globalSkeleton) globalSkeleton.remove();
    }

    if (this.images.length === 0) {
      // No images: hide media column and controls
      if (mediaSection) mediaSection.style.display = 'none';
      if (sliderControls) sliderControls.style.display = 'none';
      if (this.imgEl) {
        this.imgEl.style.display = 'none';
        this.imgEl.src = '';
        this.imgEl.alt = '';
        this.imgEl.classList.remove('image-error');
        this.imgEl.removeAttribute('loading');
      }
    } else {
      // Images present: show media and initialize first image
      if (mediaSection) mediaSection.style.display = '';
      if (sliderControls) sliderControls.style.display = this.images.length > 1 ? 'flex' : 'none';

      // Reset image element state and force eager loading while modal is visible
      if (this.imgEl) {
        this.imgEl.style.display = 'block';
        this.imgEl.classList.remove('image-error');
        this.imgEl.setAttribute('loading', 'lazy');
        this.imgEl.alt = `${data.title} - Image ${this.currentIndex + 1}`;
      }

      this.updateImage();
    }
    
    if (this.modalEl) {
      this.modalEl.classList.add('active');
      logger.log('Modal class list after adding active:', this.modalEl.classList);
    }
    
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  private getProjectData(element: HTMLElement): ProjectData | null {
    const title = element.querySelector('.project-title')?.textContent || '';
    const category = element.querySelector('.project-category')?.textContent || '';
    const imagesStr = element.getAttribute('data-images') || '[]';
    const webpImagesStr = element.getAttribute('data-webp-images') || '[]';
    const description = element.getAttribute('data-description') || '';
    const technologies = element.getAttribute('data-technologies') || '';
    const githubUrl = element.getAttribute('data-github') || '';
    const liveUrl = element.getAttribute('data-live') || '';
    const codedexUrl = element.getAttribute('data-codedex') || '';
    const videoUrl = element.getAttribute('data-video') || '';

    try {
      const images = JSON.parse(imagesStr);
      const webpImages = JSON.parse(webpImagesStr);
      
      return {
        title,
        category,
        images,
        webpImages,
        description,
        technologies,
        videoUrl: videoUrl || undefined,
        githubUrl,
        liveUrl,
        codedexUrl: codedexUrl || undefined,
      };
    } catch (e) {
      logger.error('Error parsing project data:', e);
      return null;
    }
  }

  public openProjectModal(data: ProjectData): void {
    logger.log('Opening project modal for:', data.title);
    
    // Use WebP if supported, fallback to regular images
    const supportsWebp = document.documentElement.classList.contains('webp');
    this.projectWebpImages = (data.webpImages || []).filter((p) => p.endsWith('.webp') || p.endsWith('.avif'));
    this.projectJpegImages = (data.images || []);
    this.images = supportsWebp && this.projectWebpImages.length > 0 ? this.projectWebpImages : this.projectJpegImages;
    this.currentIndex = 0;

    // Get project modal elements
    const projectModal = document.getElementById('projectModal');
    const projectImage = document.getElementById('project-modal-image') as HTMLImageElement;
    this.projectSourceWebpEl = document.querySelector('.project-image-webp');
    this.projectSourceJpegEl = document.querySelector('.project-image-jpeg');
    const projectTitle = document.getElementById('project-modal-title');
    const projectDescription = document.querySelector('.project-info-description');
    const projectTechStack = document.querySelector('.tech-stack');
    const projectGithub = document.querySelector('.project-github') as HTMLAnchorElement;
    const projectLive = document.querySelector('.project-live') as HTMLAnchorElement;

    // Ensure Codédex button exists in links container
    const linksContainer = document.querySelector('.project-info-links') as HTMLElement;
    let projectCodedex = document.querySelector('.project-codedex') as HTMLAnchorElement | null;
    if (linksContainer && !projectCodedex) {
      projectCodedex = document.createElement('a');
      projectCodedex.className = 'project-link project-codedex';
      projectCodedex.target = '_blank';
      projectCodedex.rel = 'noopener noreferrer';
      projectCodedex.setAttribute('aria-label', 'View Codédex post (opens in new tab)');
      projectCodedex.style.display = 'none';
      projectCodedex.innerHTML = '<span class="link-icon">📝</span> View Codédex Post';
      linksContainer.appendChild(projectCodedex);
    }

    const currentImageNum = document.querySelector('.current-image-number');
    const totalImagesNum = document.querySelector('.total-images');
    const imageContainer = document.querySelector('.project-gallery-image-container') as HTMLElement;

    // Clean up any image error placeholders that may overlay the media container
    if (imageContainer) {
      const errorPlaceholder = imageContainer.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
      const skeleton = imageContainer.querySelector('.image-loading-skeleton');
      if (skeleton) skeleton.remove();
    }

    // Set project data
    if (projectTitle) projectTitle.textContent = data.title;

    // Update modal link buttons (GitHub/Live) based on project data
    const ghLink = document.querySelector('.project-link.project-github') as HTMLAnchorElement | null;
    const liveLink = document.querySelector('.project-link.project-live') as HTMLAnchorElement | null;
    if (ghLink) {
      if (data.githubUrl) {
        ghLink.href = data.githubUrl;
        ghLink.style.display = '';
      } else {
        ghLink.style.display = 'none';
      }
    }
    if (liveLink) {
      if (data.liveUrl) {
        liveLink.href = data.liveUrl;
        liveLink.style.display = '';
      } else {
        liveLink.style.display = 'none';
      }
    }
    if (projectDescription) {
      // Render rich HTML for RGBC ATM project
      const rgTitleMatch = data.title.startsWith('RGBC: Richard Gwapo Banking Corporation');
      if (rgTitleMatch) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section"><h4>Project Overview</h4><p>The ATM Transaction System is a Java-based graphical application that simulates the core functionalities of an Automated Teller Machine (ATM). Developed using <strong>Java Swing</strong>, this program allows users to perform basic banking operations such as <strong>balance inquiry</strong>, <strong>withdrawal</strong>, <strong>deposit</strong>, and <strong>fund transfer</strong>, while also incorporating an <strong>administrator interface</strong> for managing customer accounts.</p><p>This project demonstrates concepts of <strong>object-oriented programming</strong>, <strong>GUI design with Swing</strong>, <strong>data validation</strong>, and <strong>user input handling</strong>. It aims to provide a realistic banking experience in a controlled simulation, integrating both <strong>user</strong> and <strong>admin</strong> functionalities within a secure system.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Key Features</h4><h5>User Features</h5><ol><li><strong>Login Authentication</strong><br><span>Users must enter their account number and corresponding 4‑digit PIN to access their account. The system allows <strong>3 login attempts</strong> before locking the account for security.</span></li><li><strong>Balance Inquiry</strong><br><span>Displays the current balance and account details of the user.</span></li><li><strong>Withdrawal</strong><br><span>Allows users to withdraw funds if sufficient balance is available.</span><br><em>Minimum withdrawal amount:</em> ₱100.00</li><li><strong>Deposit</strong><br><span>Users can deposit funds into their account.</span><br><em>Minimum deposit amount:</em> ₱100.00</li><li><strong>Fund Transfer</strong><br><span>Enables users to transfer funds to another account within the system.</span><br><em>Minimum transfer amount:</em> ₱1,000.00<br><span>A service fee of ₱25.00 is automatically deducted from the sender's balance.</span></li><li><strong>Error Handling</strong><br><span>Invalid inputs, insufficient balance, and invalid account numbers are handled gracefully with informative prompts.</span></li></ol></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h5>Administrator Features</h5><ol><li><strong>Admin Login</strong><br><span>The admin uses a dedicated account (<code>Account No: 0000</code>, <code>PIN: 0000</code>) to access management features.</span></li><li><strong>View Customer Information</strong><br><span>Displays a customer's account number, name, balance, and account status.</span></li><li><strong>Add New Customer</strong><br><span>Allows the admin to register a new customer by entering details such as account number, name, balance, PIN, and status.</span><br><span>Input validations ensure all fields are correctly formatted (e.g., 5‑digit account numbers, 4‑digit PINs).</span></li><li><strong>Edit Customer Information</strong><br><span>Enables the admin to update a customer's name and account status (Active or Locked).</span></li><li><strong>Change Customer PIN</strong><br><span>Provides the option to reset or update a customer's 4‑digit PIN.</span></li><li><strong>Account Locking Mechanism</strong><br><span>Accounts are automatically locked after multiple failed login attempts, protecting users from unauthorized access.</span></li></ol></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>System Design and Logic</h4><ul><li><strong>Data Storage:</strong> Account details are stored in a 2D string array (<code>ACCOUNT_TABLE</code>), where each row represents an account containing: <code>[Account Number, Account Name, Balance, PIN, Status]</code>.</li><li><strong>User Interface:</strong> The program utilizes Java Swing's <code>JOptionPane</code> for GUI-based interactions, making it intuitive and user-friendly.</li><li><strong>Program Flow:</strong> <ol><li>Main Menu: Start transaction or quit.</li><li>Login Validation: Checks credentials with a 3-attempt limit.</li><li>Transaction Menu: Displays available operations depending on user type (Customer or Admin).</li><li>Transaction Execution: Performs selected action with data validation and updates in real-time.</li></ol></li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Error Handling and Validation</h4><ul><li>Input validation ensures correct data formats for account numbers, PINs, and monetary amounts.</li><li>Prevents empty inputs and invalid operations (e.g., overdrafts, non-numeric inputs).</li><li>Locked accounts are prevented from accessing any transaction.</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Educational Value</h4><ul><li>GUI-based applications using Swing</li><li>Arrays and data management</li><li>Conditional logic and looping</li><li>Error handling and validation</li><li>Program modularization and code reusability</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Future Enhancements</h4><ul><li>Integration with a database (MySQL) for persistent storage</li><li>Implementation of transaction history logs</li><li>Improved user interface design with custom forms</li><li>Multi-language or localization support</li><li>Enhanced security features like encryption for PIN storage</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Conclusion</h4><p>The <strong>RGBC ATM Transaction System</strong> is a comprehensive Java Swing project that effectively simulates real‑world ATM functionalities. It highlights the technical implementation of user authentication, transactions, and admin management while emphasizing robust input validation, user experience, and program reliability — a strong foundation for more advanced banking systems.</p></div>`;
      } else if (data.title.trim() === 'PHP-Loan-System' || data.title.includes('PHP Loan System')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section"><p>This repository contains a PHP/MySQL project focused on creating a loan management system. It was completed during my Grade 12 year at the University of Makati as part of the Laboratory Exercises for COMPROG 3 under the supervision of Mr. Roel Richard C. Traballo, a faculty member of the College of Computer Science. The system is a simulation of a basic loan application process, including user authentication, loan calculation, and loan confirmation functionalities.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Project Overview</h4><p>The PHP Loan System Project is a dynamic web application that guides users through the loan application process. The system includes multiple pages to ensure that the user experience is intuitive and structured. This includes:</p><ul><li><strong>A Login Page</strong> where users authenticate their credentials.</li><li><strong>A Loan Amount Page</strong> for users to input loan details.</li><li><strong>A Loan Information Page</strong> to display computed loan data and monthly dues.</li><li><strong>A Loan Confirmation Page</strong> for finalizing the application process.</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4><ol><li><strong>Login System</strong><ul><li>Validates username and password (limited to 5 characters).</li><li>Displays appropriate error messages for invalid inputs.</li><li>Proceeds to the loan process upon successful authentication.</li></ul></li><li><strong>Loan Amount Input</strong><ul><li>Users specify the loan amount and repayment term (6, 12, or 24 months).</li><li>Interest rates differ based on user type (Officer: 5%, Member: 10%).</li></ul></li><li><strong>Loan Information Display</strong><ul><li>Computes total interest, total payable amount, and monthly dues.</li><li>Offers options to confirm or reset entries.</li></ul></li><li><strong>Loan Confirmation</strong><ul><li>Summarizes the loan details.</li><li>Provides a "Back to Login Page" button to restart the process.</li></ul></li><li><strong>Interactive Buttons</strong><ul><li><em>Accept:</em> Processes user login and navigates to the next page.</li><li><em>Clear All:</em> Resets user input fields.</li><li><em>Submit:</em> Finalizes loan application details.</li><li><em>Back:</em> Navigates to the previous step.</li></ul></li></ol></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>System Workflow</h4><div class="desc-subsection"><h5>Page 1: Login Page</h5><ul><li><strong>Input Fields:</strong> Username and Password (maximum of 5 characters each).</li><li><strong>Outputs:</strong><ul><li><em>Error Message for Empty Values:</em> Prompts users to fill in all fields.</li><li><em>Error Message for Incorrect Credentials:</em> Displays "Incorrect Username or Password."</li><li><em>Success:</em> Displays "Password Accepted" and navigates to the Loan Amount page.</li></ul></li></ul></div><div class="desc-subsection"><h5>Page 2: Loan Amount Page</h5><ul><li><strong>Input Fields:</strong> Loan Amount, Repayment Term (6, 12, or 24 months).</li><li><strong>Buttons:</strong> <em>Confirm Loan</em> (proceeds to the Loan Information page), <em>Clear All</em> (resets inputs).</li></ul></div><div class="desc-subsection"><h5>Page 3: Loan Information Page</h5><ul><li><strong>Outputs:</strong> Computed interest, total payable amount, and monthly dues.</li><li><strong>Buttons:</strong> <em>Submit</em> (navigates to Loan Confirmation), <em>Back</em> (returns to Loan Amount).</li></ul></div><div class="desc-subsection"><h5>Page 4: Loan Confirmation Page</h5><ul><li><strong>Outputs:</strong> Final loan details including interest, total payable amount, and monthly dues.</li><li><strong>Button:</strong> <em>Back to Login Page</em> (restarts the application process).</li></ul></div></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technologies Used</h4><ul><li><strong>Backend:</strong> PHP</li><li><strong>Database:</strong> MySQL</li><li><strong>Frontend:</strong> HTML, CSS, Bootstrap</li><li><strong>Tools:</strong> XAMPP/WAMP (for local server setup)</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Setup Instructions</h4><ol><li><strong>Clone the repository:</strong><pre><code>git clone https://github.com/your-username/PHP-Loan-System.git</code></pre></li><li><strong>Import the Database:</strong><ul><li>Use the <code>.sql</code> file included in the repository.</li><li>Import it into your MySQL database via PHPMyAdmin or a terminal.</li></ul></li><li><strong>Configure Database Connection:</strong><ul><li>Locate the database configuration section in the PHP files.</li><li>Update credentials to match your local MySQL setup.</li></ul></li><li><strong>Run the Project:</strong><ul><li>Start a local server using XAMPP or WAMP.</li><li>Access the project in your browser at <code>http://localhost/PHP-Loan-System</code>.</li></ul></li></ol></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Database Details</h4><p>The database schema includes a table for user accounts and a reference loan table for calculations. Below are sample values:</p><table><thead><tr><th>User Type</th><th>Loan Amount</th><th>Interest (%)</th><th>Total Amount</th><th>Monthly Dues (6 mos)</th><th>Monthly Dues (12 mos)</th><th>Monthly Dues (24 mos)</th></tr></thead><tbody><tr><td>Officer</td><td>5,000.00</td><td>5%</td><td>5,250.00</td><td>875.00</td><td>437.50</td><td>218.75</td></tr><tr><td>Member</td><td>10,000.00</td><td>10%</td><td>11,000.00</td><td>1,833.33</td><td>916.67</td><td>458.33</td></tr></tbody></table></div>`;
      } else if (data.title.trim() === 'Hand Gesture Recognition and Arduino Integration' || data.title.includes('Hand Gesture Recognition')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section"><p>This project combines computer vision and embedded systems to detect hand gestures and control various outputs using an Arduino. It leverages Python for hand gesture detection with the Mediapipe library and Arduino to process the received data for hardware interfacing.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4><ol><li><strong>Real-Time Hand Gesture Detection</strong><ul><li>Detects individual fingers' states (up or down) using Mediapipe's Hand Tracking module.</li><li>Outputs the state of each finger as a binary array (e.g., <code>[1, 0, 1, 1, 0]</code> ).</li></ul></li><li><strong>Hardware Integration</strong><ul><li>Sends the detected finger states to an Arduino over a serial connection.</li><li>Controls LEDs and a servo motor based on the detected gestures.</li></ul></li><li><strong>User Feedback</strong><ul><li>Provides real-time updates on an I2C LCD display connected to the Arduino.</li><li>Indicates the number of fingers up and down dynamically.</li></ul></li><li><strong>Servo Motor Control</strong><ul><li>Maps the number of fingers detected as "up" to servo angles (0° to 180°).</li></ul></li></ol></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Project Architecture</h4><h5>Software Components</h5><ol><li><strong>Python Script</strong><ul><li>Uses OpenCV to capture video and process hand gestures.</li><li>Utilizes Mediapipe for detecting and classifying finger positions.</li><li>Sends gesture data to Arduino via serial communication.</li></ul></li><li><strong>Arduino Code</strong><ul><li>Receives gesture data from Python.</li><li>Controls LEDs to indicate individual finger states.</li><li>Updates an LCD display with the number of fingers "up" and "down."</li><li>Moves a servo motor based on the number of fingers "up."</li></ul></li></ol></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Installation and Setup</h4><h5>Hardware Requirements</h5><ul><li>Arduino Uno or compatible microcontroller</li><li>5 LEDs with resistors</li><li>Servo motor</li><li>I2C-compatible LCD (e.g., 16x2 display with I2C module)</li><li>Breadboard and connecting wires</li><li>Webcam for video input</li></ul><h5>Software Requirements</h5><ul><li>Python 3.7+</li><li>Mediapipe</li><li>OpenCV</li><li>PySerial</li><li>Arduino IDE</li></ul><h5>Wiring Diagram</h5><ol><li><strong>LEDs:</strong> <ul><li>Connect LEDs to Arduino pins (8–12).</li><li>Ensure proper grounding with resistors.</li></ul></li><li><strong>Servo Motor:</strong> <ul><li>Signal pin connected to pin 13 on Arduino.</li><li>Power and ground connected appropriately.</li></ul></li><li><strong>I2C LCD:</strong> <ul><li>SDA and SCL connected to Arduino's A4 and A5 pins (for Uno).</li><li>Ensure proper power connections.</li></ul></li></ol></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technical Details</h4><h5>Python Code</h5><ul><li><strong>Hand Gesture Detection:</strong> Identifies the positions of key hand landmarks and determines if each finger is up or down based on landmark positions.</li><li><strong>Serial Communication:</strong> Sends the detected finger states to the Arduino in a comma-separated format.</li></ul><h5>Arduino Code</h5><ul><li><strong>Serial Parsing:</strong> Reads the incoming string and extracts finger states.</li><li><strong>LED Control:</strong> Updates the state of LEDs based on finger states.</li><li><strong>LCD Feedback:</strong> Dynamically displays the number of fingers up and down.</li><li><strong>Servo Motor:</strong> Maps finger count to servo angles for proportional movement.</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Future Improvements</h4><ol><li><strong>Gesture Customization:</strong> Add recognition for specific hand gestures (e.g., thumbs-up, peace sign).</li><li><strong>Wireless Communication:</strong> Replace the serial connection with Bluetooth or Wi‑Fi for greater flexibility.</li><li><strong>Expand Hardware Interactions:</strong> Control more devices like robotic arms or IoT appliances.</li><li><strong>Enhanced Visual Feedback:</strong> Overlay detected finger states directly onto the webcam feed.</li></ol></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Future Enhancements</h4><ul><li>Integration with a database (MySQL) for persistent storage</li><li>Implementation of transaction history logs</li><li>Improved user interface design with custom forms</li><li>Multi-language or localization support</li><li>Enhanced security features like encryption for PIN storage</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Conclusion</h4><p>The <strong>RGBC ATM Transaction System</strong> is a comprehensive Java Swing project that effectively simulates real‑world ATM functionalities. It highlights the technical implementation of user authentication, transactions, and admin management while emphasizing robust input validation, user experience, and program reliability — a strong foundation for more advanced banking systems.</p></div>`;
      } else if (data.title.trim() === 'FinanceWise') {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section"><p>FinanceWise is a comprehensive financial advisory platform designed to help users make informed decisions about spending, investments, and loans. Our platform combines modern design with practical financial tools to provide a seamless user experience.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4>
          <div class="desc-subsection"><h5>SpendWise</h5><ul><li>Personalized spending advice based on your financial circumstances</li><li>Smart budgeting recommendations</li><li>Expense tracking and analysis</li></ul></div>
          <div class="desc-subsection"><h5>InvestWise</h5><ul><li>Customized investment suggestions</li><li>Risk assessment tools</li><li>Portfolio diversification guidance</li></ul></div>
          <div class="desc-subsection"><h5>LoanWise</h5><ul><li>Loan eligibility assessment</li><li>Interest rate comparisons</li><li>Repayment strategy planning</li></ul></div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technologies Used</h4><ul><li>HTML5</li><li>CSS3</li><li>JavaScript</li><li>Particles.js for interactive background</li><li>Modern UI/UX principles</li><li>Responsive Design</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Design Features</h4><ul><li>Modern and intuitive user interface</li><li>Responsive design for all devices</li><li>Interactive particle background</li><li>Smooth animations and transitions</li><li>Professional color scheme</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Configuration</h4><p>The project uses <strong>Particles.js</strong> for the interactive background. You can customize particle behavior by modifying the <code>particlesjs-config.json</code> file in the <code>loading</code> directory.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Responsive Design</h4><p>FinanceWise is built with a mobile-first approach, ensuring a seamless experience across all devices:</p><ul><li>Desktop</li><li>Tablet</li><li>Mobile phones</li></ul></div>`;
      } else if (data.title.trim() === 'green-pulse' || data.title.includes('GreenPulse') || data.title.includes('Green Pulse')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section"><p>GreenPulse is an interactive web application designed to promote sustainability and eco-friendly practices. It provides users with tools to calculate their environmental impact, offers personalized eco-tips, and features various sustainability-related functionalities.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4><ul><li><strong>Sustainability Calculator:</strong> Calculate your carbon footprint based on daily activities.</li><li><strong>Eco Tips:</strong> Get personalized eco-friendly tips generated by AI.</li><li><strong>Chat Functionality:</strong> Engage with a chatbot for instant responses and support.</li><li><strong>Progress Tracking:</strong> Visualize your progress towards sustainability goals.</li><li><strong>Interactive UI:</strong> Enjoy a user-friendly interface with animations and effects.</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technologies Used</h4><ul><li><strong>Frontend:</strong> HTML, CSS, JavaScript</li><li><strong>Frameworks:</strong> React, Vite</li><li><strong>APIs:</strong> Google Generative AI for eco-tips and chatbot responses</li><li><strong>Charting:</strong> Chart.js for visualizing data</li><li><strong>Styling:</strong> Tailwind CSS for responsive design</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Usage</h4><ul><li><strong>Sustainability Calculator:</strong> Fill in the form with your daily activities to calculate your carbon footprint.</li><li><strong>Eco Tips:</strong> Click on the \"Get Eco Tip\" button to receive a personalized tip.</li><li><strong>Chatbot:</strong> Use the chat feature to ask questions and get instant responses.</li></ul></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Database Details</h4><p>The database schema includes a table for user accounts and a reference loan table for calculations. Below are sample values:</p><table><thead><tr><th>User Type</th><th>Loan Amount</th><th>Interest (%)</th><th>Total Amount</th><th>Monthly Dues (6 mos)</th><th>Monthly Dues (12 mos)</th><th>Monthly Dues (24 mos)</th></tr></thead><tbody><tr><td>Officer</td><td>5,000.00</td><td>5%</td><td>5,250.00</td><td>875.00</td><td>437.50</td><td>218.75</td></tr><tr><td>Member</td><td>10,000.00</td><td>10%</td><td>11,000.00</td><td>1,833.33</td><td>916.67</td><td>458.33</td></tr></tbody></table></div>`;
      } else if (data.title.trim() === 'Kita-Kita (Agentic)' || data.title.includes('Agentic')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `
        <div class="desc-section"><h4>The Challenge: Financial Empowerment for Every Filipino</h4>
          <p>In the Philippines, millions lack access to personalized financial guidance, making it difficult to manage debt, optimize cash flow, and build long-term wealth. Kita-kita was born out of a need to bridge this gap, providing a sophisticated yet accessible AI-powered financial co-pilot tailored to the unique economic landscape of the Philippines.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Our Solution: Key Features</h4>
          <div class="desc-subsection"><p>🤖 <strong>AI Financial Agents:</strong> A suite of intelligent assistants designed to tackle specific financial goals:</p>
            <ul>
              <li><strong>Debt Demolisher:</strong> Creates a personalized, automated debt-elimination plan.</li>
              <li><strong>Cashflow Optimizer:</strong> Analyzes spending habits and identifies opportunities to save.</li>
              <li><strong>Wealth Builder:</strong> Provides long-term investment guidance with a focus on the Philippine market.</li>
            </ul>
          </div>
          <div class="desc-subsection"><p>💰 <strong>Unified Financial Hub:</strong></p>
            <ul>
              <li>Manage all your bank accounts and e-wallets in one place.</li>
              <li>Track transactions, categorize spending, and monitor recurring subscriptions seamlessly.</li>
            </ul>
          </div>
          <div class="desc-subsection"><p>📈 <strong>Advanced Analytics & Forecasting:</strong></p>
            <ul>
              <li>Visualize your financial health with real-time charts and dashboards.</li>
              <li>Leverage AI-powered predictions to anticipate future expenses and make informed decisions.</li>
            </ul>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>How We Built It: Tech Stack</h4>
          <table>
            <thead><tr><th>Category</th><th>Technologies</th></tr></thead>
            <tbody>
              <tr><td>Frontend</td><td>HTML5, CSS3, JavaScript (ES6+)</td></tr>
              <tr><td>Backend</td><td>Node.js, Express.js</td></tr>
              <tr><td>Database</td><td>Firebase Firestore</td></tr>
              <tr><td>AI</td><td>Llama 3 (running locally)</td></tr>
              <tr><td>Platform</td><td>Firebase (Auth, Hosting)</td></tr>
              <tr><td>Libraries</td><td>Chart.js, Helmet, Express Rate Limit</td></tr>
              <tr><td>Dev Tools</td><td>Jest, Nodemon, Sentry</td></tr>
            </tbody>
          </table>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Project Overview</h4>
          <p>Kita-kita is a comprehensive AI-powered banking and financial management platform that helps users track expenses, manage bank accounts, forecast financial trends, and make informed financial decisions through intelligent AI agents.</p>
          <div class="desc-subsection"><h5>Key Features</h5>
            <ul>
              <li>🤖 <strong>AI Financial Agents:</strong> Multiple specialized AI assistants for different financial needs</li>
              <li>💳 <strong>Transaction Management:</strong> Add, track, and categorize income/expense transactions</li>
              <li>🏦 <strong>Bank Account Integration:</strong> Manage multiple bank accounts and e-wallets</li>
              <li>📊 <strong>Financial Analytics:</strong> Real-time charts and financial health monitoring</li>
              <li>🔮 <strong>Expense Forecasting:</strong> AI-powered predictions for future expenses</li>
              <li>📱 <strong>Subscription Management:</strong> Track and optimize recurring payments</li>
              <li>🕰️ <strong>Financial Time Machine:</strong> Explore alternate financial scenarios</li>
              <li>💡 <strong>Ipon Coach:</strong> Personalized savings guidance and tips</li>
            </ul>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Usage Guide</h4>
          <div class="desc-subsection"><h5>Getting Started</h5>
            <ol>
              <li><strong>Sign Up/Login:</strong> Create an account or login with existing credentials</li>
              <li><strong>Dashboard Overview:</strong> View your financial summary and recent transactions</li>
              <li><strong>Add Bank Accounts:</strong> Set up your bank accounts and e-wallets</li>
              <li><strong>Record Transactions:</strong> Add income and expense transactions</li>
              <li><strong>Explore AI Agents:</strong> Use specialized AI assistants for financial guidance</li>
            </ol>
          </div>
          <div class="desc-subsection"><h5>AI Agents & How to Use Them</h5>
            <ol>
              <li><strong>Debt Demolisher</strong>
                <p><em>Purpose:</em> Creates a personalized and automated debt-elimination plan. It analyzes your liabilities and simulates the most effective payoff strategies (like the Avalanche and Snowball methods) to help you become debt-free faster.</p>
                <p><em>How to Test:</em></p>
                <ul>
                  <li>Link accounts that have a negative balance (e.g., credit cards, loans).</li>
                  <li>Navigate to the "Debt Demolisher" agent from the dashboard.</li>
                  <li>The agent will automatically analyze your debt and present you with a tailored repayment plan, showing you the estimated payoff date and potential interest savings.</li>
                </ul>
              </li>
              <li><strong>Cashflow Optimizer</strong>
                <p><em>Purpose:</em> Analyzes your spending habits to identify opportunities for improvement. It automatically detects recurring subscriptions, highlights areas of high spending, and provides actionable tips to help you increase your savings.</p>
                <p><em>How to Test:</em></p>
                <ul>
                  <li>Ensure you have a variety of transactions logged, including recurring ones (like Netflix or Spotify).</li>
                  <li>Access the "Cashflow Optimizer" from the dashboard.</li>
                  <li>Review the agent's findings, which will include a list of your subscriptions and personalized recommendations for reducing expenses.</li>
                </ul>
              </li>
              <li><strong>Wealth Builder</strong>
                <p><em>Purpose:</em> Acts as your long-term investment and wealth-growth assistant. It provides guidance on building a diversified portfolio with a focus on the Philippine financial context, suggesting investments like index funds, UITFs, and Pag-IBIG MP2.</p>
                <p><em>How to Test:</em></p>
                <ul>
                  <li>Make sure your income, savings, and investment accounts are set up.</li>
                  <li>Open the "Wealth Builder" agent.</li>
                  <li>Ask for an investment plan, and the agent will provide personalized recommendations based on your financial profile and long-term goals.</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Philippine Financial Context</h4>
          <p>Kita-Kita is specifically designed to address the unique financial challenges and opportunities in the Philippines:</p>
          <div class="desc-subsection"><h5>Financial Inclusion</h5>
            <ul>
              <li><strong>Unbanked Population:</strong> Helps the 51.2 million unbanked Filipinos (BSP, 2021) access financial services</li>
              <li><strong>Digital Adoption:</strong> Bridges the gap between traditional banking and digital finance adoption</li>
              <li><strong>Rural Access:</strong> Provides financial services to underserved rural communities</li>
            </ul>
          </div>
          <div class="desc-subsection"><h5>Philippine-Specific Features</h5>
            <ul>
              <li><strong>Local Financial Products:</strong> Integration with popular Philippine e-wallets (GCash, Maya, etc.)</li>
              <li><strong>Peso-Optimized Budgeting:</strong> Budgeting templates tailored to Philippine cost of living</li>
              <li><strong>BSP Compliance:</strong> All advice follows Bangko Sentral ng Pilipinas regulations</li>
              <li><strong>Tax Optimization:</strong> Guidance on Philippine tax laws and BIR requirements</li>
              <li><strong>OFW Support:</strong> Specialized advice for Overseas Filipino Workers on remittances and investments</li>
            </ul>
          </div>
          <div class="desc-subsection"><h5>Economic Impact</h5>
            <ul>
              <li><strong>Financial Literacy:</strong> Addresses the critical need for improved financial education</li>
              <li><strong>MSME Support:</strong> Specialized guidance for micro, small, and medium enterprises</li>
              <li><strong>Sustainable Development:</strong> Aligned with Philippine Development Plan 2023–2028</li>
            </ul>
          </div>
        </div>`;
      } else if (data.title.trim() === 'Kita-Kita') {
  projectDescription.classList.add('rich');
  projectDescription.innerHTML = `
    <div class="desc-section"><h4>Overview</h4>
      <p>Kita-Kita is an AI-powered banking platform that combines secure financial services with intelligent chatbot assistance. It features six specialized AI companions that collaborate to deliver comprehensive financial guidance, security, and personalized insights.</p>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>🌟 Core Features</h4>
      <div class="desc-subsection"><h5>🤖 The Kita Companions</h5>
        <ol>
          <li><strong>Gabay Gastos</strong>
            <ul>
              <li>Advanced AI financial behavior analysis</li>
              <li>Intelligent spending pattern detection</li>
              <li>Real-time spending insights and analytics</li>
            </ul>
            <p><strong>Features:</strong></p>
            <ul>
              <li>Monthly spending overview with trend analysis</li>
              <li>Category-based expense tracking</li>
              <li>Savings rate monitoring</li>
              <li>Recurring expense identification</li>
              <li>AI-powered personalized insights</li>
              <li>Smart budget recommendations</li>
            </ul>
          </li>
          <li><strong>Dunong Puhunan</strong>
            <ul>
              <li>Investment trend analysis</li>
              <li>Market opportunity identification</li>
              <li>Portfolio performance tracking</li>
            </ul>
            <p><strong>Features:</strong></p>
            <ul>
              <li>Sector-specific trend monitoring</li>
              <li>Investment recommendations</li>
              <li>Risk-adjusted return analysis</li>
              <li>Market insights and alerts</li>
            </ul>
          </li>
          <li><strong>Bantay Utang</strong>
            <ul>
              <li>Comprehensive financial metrics analysis</li>
              <li>Income stability assessment</li>
              <li>Credit behavior monitoring</li>
            </ul>
            <p><strong>Features:</strong></p>
            <ul>
              <li>Income source categorization</li>
              <li>Expense pattern analysis</li>
              <li>Cash flow volatility tracking</li>
              <li>Loan recommendations</li>
              <li>Budget insights</li>
              <li>Payment history analysis</li>
            </ul>
          </li>
          <li><strong>Iwas Scam</strong>
            <ul>
              <li>AI-powered fraud detection</li>
              <li>Transaction pattern monitoring</li>
              <li>Security risk assessment</li>
            </ul>
            <p><strong>Features:</strong></p>
            <ul>
              <li>Real-time transaction monitoring</li>
              <li>Location-based security checks</li>
              <li>Merchant category monitoring</li>
              <li>Device and session tracking</li>
              <li>Risk scoring system</li>
              <li>Security recommendations</li>
            </ul>
          </li>
          <li><strong>Tiwala Score</strong>
            <ul>
              <li>Credit score optimization</li>
              <li>Payment history tracking</li>
              <li>Financial behavior analysis</li>
            </ul>
            <p><strong>Features:</strong></p>
            <ul>
              <li>Credit analysis engine</li>
              <li>Payment history monitoring</li>
              <li>Income stability tracking</li>
              <li>Saving habits assessment</li>
              <li>Smart budget creation</li>
              <li>Automatic payment setup</li>
            </ul>
          </li>
          <li><strong>Patunay Check</strong>
            <ul>
              <li>KYC (Know Your Customer) management</li>
              <li>Regulatory compliance monitoring</li>
              <li>Document verification system</li>
            </ul>
            <p><strong>Features:</strong></p>
            <ul>
              <li>Document validity tracking</li>
              <li>Compliance status monitoring</li>
              <li>Required action notifications</li>
              <li>Income-based requirements</li>
              <li>Security status overview</li>
              <li>Document verification workflow</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>📊 Financial Health Analysis</h4>
      <ul>
        <li><strong>Real-time Analytics:</strong> Continuous monitoring of all financial activities</li>
        <li><strong>Risk Assessment:</strong> Multi-factor risk analysis across all companions</li>
        <li><strong>Personalized Insights:</strong> AI-driven recommendations based on financial patterns</li>
        <li><strong>Security Monitoring:</strong> Integrated security and fraud prevention</li>
        <li><strong>Compliance Tracking:</strong> Automated regulatory compliance monitoring</li>
      </ul>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>🧠 AI-Powered Integration</h4>
      <p>Each companion features:</p>
      <ul>
        <li><strong>Natural Language Processing:</strong> Understands complex financial queries</li>
        <li><strong>Contextual Awareness:</strong> Remembers preferences and history</li>
        <li><strong>Real-time Updates:</strong> Instant notifications for important events</li>
        <li><strong>Cross-companion Communication:</strong> Integrated insights across all tools</li>
        <li><strong>Secure Authentication:</strong> Protected access to sensitive financial data</li>
      </ul>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>🚀 Features</h4>
      <ul>
        <li><strong>AI-Powered Chatbot:</strong> Intelligent assistance for banking queries and financial advice</li>
        <li><strong>Secure Banking Integration:</strong> Safe and reliable banking operations</li>
        <li><strong>Real-time Analytics:</strong> Data visualization powered by Chart.js</li>
        <li><strong>Firebase Backend:</strong> Robust and scalable cloud infrastructure</li>
        <li><strong>Responsive Design:</strong> Seamless experience across devices</li>
        <li><strong>Error Tracking:</strong> Integrated Sentry for robust error monitoring</li>
      </ul>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>🛠️ Technology Stack</h4>
      <ul>
        <li><strong>Frontend:</strong> React.js with custom CSS styling</li>
        <li><strong>Backend:</strong> Node.js, Express.js</li>
        <li><strong>Database:</strong> Firebase</li>
        <li><strong>Authentication:</strong> Firebase Auth</li>
        <li><strong>Analytics:</strong> Chart.js</li>
        <li><strong>Error Tracking:</strong> Sentry</li>
        <li><strong>Other Tools:</strong> CORS, dotenv, node-fetch</li>
      </ul>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>📋 Prerequisites</h4>
      <ul>
        <li>Node.js (v14 or higher)</li>
        <li>npm or yarn</li>
        <li>Firebase account</li>
        <li>Sentry account (for error tracking)</li>
      </ul>
    </div>
  `;
} else if (data.title.trim() === 'DokQ' || data.title.includes('DokQ')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `
        <div class="desc-section"><h4>DokQ — Smart Queuing and Appointments for Healthcare</h4>
          <p>DokQ is an integrated platform for discovering healthcare facilities and managing appointments. It focuses on reducing wait times, improving clinic efficiency, and giving patients a simple, modern experience on web and mobile.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Highlights</h4>
          <ul>
            <li>Simple and secure authentication (email or Google)</li>
            <li>Fast appointment booking and editing</li>
            <li>Patient dashboard with consult history and documents</li>
            <li>Facility discovery with filters and details</li>
            <li>Accessible UI, responsive across devices</li>
          </ul>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Environment variables</h4>
          <p>Create an <code>.env.local</code> (used by Vite) with the following keys:</p>
          <pre><code>VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=</code></pre>
          <p>You can verify your environment locally:</p>
          <pre><code>npm run verify-env</code></pre>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Project scripts</h4>
          <pre><code>npm run dev        # Start Vite dev server
npm run build      # Build frontend
npm run build:all  # Build frontend + API
npm run start      # Start API/server (production)
npm run test       # Run unit tests (Vitest)
npm run lint       # Lint + Prettier check
npm run lint:fix   # Autofix lint errors & format</code></pre>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Tech stack</h4>
          <ul>
            <li>React, TypeScript, Vite</li>
            <li>Node.js/Express for API</li>
            <li>Firebase (Auth, Firestore, Storage)</li>
            <li>ESLint, Prettier, Vitest</li>
            <li>Vercel / Docker for deployment</li>
          </ul>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Database Details</h4>
          <p>The database schema includes a table for user accounts and a reference loan table for calculations. Below are sample values:</p><table><thead><tr><th>User Type</th><th>Loan Amount</th><th>Interest (%)</th><th>Total Amount</th><th>Monthly Dues (6 mos)</th><th>Monthly Dues (12 mos)</th><th>Monthly Dues (24 mos)</th></tr></thead><tbody><tr><td>Officer</td><td>5,000.00</td><td>5%</td><td>5,250.00</td><td>875.00</td><td>437.50</td><td>218.75</td></tr><tr><td>Member</td><td>10,000.00</td><td>10%</td><td>11,000.00</td><td>1,833.33</td><td>916.67</td><td>458.33</td></tr></tbody></table></div>`;
      } else if (data.title.trim() === 'Tindahan ni Aling Nena' || data.title.includes('Aling Nena')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `
        <div class="desc-section"><h4>Campus Mini App Challenge 2025 Submission</h4>
          <p>Submission: <strong>Tindahan ni Aling Nena</strong></p>
          <p>A blockchain-powered loyalty tracking system for Filipino sari-sari stores built on the <strong>Base</strong> network.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Project Concept</h4>
          <p><strong>"Tindahan ni Aling Nena"</strong> reimagines the traditional Filipino sari-sari store experience through Web3 technology. Every barangay has a beloved sari-sari store — this project tokenizes the loyalty experience, bringing blockchain benefits to local Filipino businesses.</p>
        </div>
        <div class="desc-section"><h4>Why Sari-Sari Stores?</h4>
          <ul>
            <li><strong>Cultural Relevance:</strong> Authentic Filipino business model</li>
            <li><strong>Real-World Impact:</strong> Practical application for local communities</li>
            <li><strong>Innovation:</strong> Traditional business meets modern Web3 technology</li>
            <li><strong>Scalability:</strong> Can be adopted by thousands of sari-sari stores nationwide</li>
          </ul>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Core Features</h4>
          <div class="desc-subsection"><h5>🛍️ Store Management</h5>
            <ul>
              <li><strong>Inventory Tracking:</strong> Real-time product management with stock levels</li>
              <li><strong>Category Organization:</strong> Food, drinks, snacks, household items</li>
              <li><strong>Search & Filter:</strong> Easy product discovery</li>
              <li><strong>Price Management:</strong> Dynamic pricing with peso display</li>
            </ul>
          </div>
          <div class="desc-subsection"><h5>🛒 Shopping Experience</h5>
            <ul>
              <li><strong>Smart Cart:</strong> Quantity management with real-time calculations</li>
              <li><strong>Digital Receipts:</strong> Onchain transaction records</li>
              <li><strong>Checkout Process:</strong> Simulated blockchain transactions</li>
              <li><strong>Order History:</strong> Complete purchase tracking</li>
            </ul>
          </div>
          <div class="desc-subsection"><h5>⭐ Loyalty System</h5>
            <ul>
              <li><strong>Points Earning:</strong> 1 point per peso spent (configurable)</li>
              <li><strong>Tier Progression:</strong> Bronze → Silver → Gold → Platinum</li>
              <li><strong>Progress Tracking:</strong> Visual progress bars to next tier</li>
              <li><strong>Rewards Analytics:</strong> Shopping statistics and trends</li>
            </ul>
          </div>
          <div class="desc-subsection"><h5>💳 Wallet Integration</h5>
            <ul>
              <li><strong>MiniKit Integration:</strong> Seamless wallet connection</li>
              <li><strong>Multi-Wallet Support:</strong> Compatible with popular Web3 wallets</li>
              <li><strong>Transaction Simulation:</strong> Realistic blockchain interactions</li>
              <li><strong>Address Management:</strong> Secure wallet address handling</li>
            </ul>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technical Implementation</h4>
          <div class="desc-subsection"><h5>🧰 Tech Stack</h5>
            <ul>
              <li><strong>Frontend:</strong> React 18 + TypeScript</li>
              <li><strong>Styling:</strong> Tailwind CSS with custom Filipino theme</li>
              <li><strong>Blockchain:</strong> Base Network (Ethereum L2)</li>
              <li><strong>Wallet Integration:</strong> MiniKit + Wagmi + Viem</li>
              <li><strong>State Management:</strong> React Context + React Query</li>
              <li><strong>Build Tool:</strong> Vite</li>
              <li><strong>Testing:</strong> Vitest + Testing Library</li>
              <li><strong>Linting:</strong> ESLint + TypeScript ESLint</li>
            </ul>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Design System</h4>
          <div class="desc-subsection"><h5>🎨 Filipino-Inspired Theme</h5>
            <ul>
              <li><strong>Colors:</strong> Orange, red, and pink gradient theme</li>
              <li><strong>Typography:</strong> System fonts with proper hierarchy</li>
              <li><strong>Components:</strong> Reusable card and button components</li>
              <li><strong>Icons:</strong> Lucide React icons for consistency</li>
            </ul>
          </div>
          <div class="desc-subsection"><h5>♿ Accessibility Features</h5>
            <ul>
              <li>ARIA labels for screen readers</li>
              <li>Keyboard navigation support</li>
              <li>High contrast color scheme</li>
              <li>Semantic HTML structure</li>
              <li>Focus management</li>
            </ul>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Mobile Experience</h4>
          <p>The application is designed as a mini-app for mobile integration:</p>
          <ul>
            <li><strong>Responsive Design:</strong> Optimized for all screen sizes</li>
            <li><strong>Touch-Friendly:</strong> Large buttons and touch targets</li>
            <li><strong>Fast Performance:</strong> Efficient rendering and smooth animations</li>
            <li><strong>Offline-Ready:</strong> Graceful handling of connection issues</li>
          </ul>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Security & Performance</h4>
          <div class="desc-subsection"><h5>🔒 Security Features</h5>
            <ul>
              <li>Input validation and sanitization</li>
              <li>Error boundaries for graceful error handling</li>
              <li>Type-safe development with TypeScript</li>
              <li>Secure wallet connection handling</li>
            </ul>
          </div>
          <div class="desc-subsection"><h5>🚀 Performance Optimizations</h5>
            <ul>
              <li>Code splitting with dynamic imports</li>
              <li>Optimized bundle size</li>
              <li>Lazy loading of components</li>
              <li>Efficient state management</li>
              <li>Memoized calculations</li>
            </ul>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Challenge Compliance</h4>
          <div class="desc-subsection"><h5>✅ Requirements Met</h5>
            <ul>
              <li><strong>MiniKit Integration:</strong> Complete implementation with error handling</li>
              <li><strong>Base Network:</strong> Properly configured for Base (Ethereum L2)</li>
              <li><strong>Functionality:</strong> Full sari-sari store with loyalty system</li>
              <li><strong>Usability:</strong> Intuitive, responsive, and accessible design</li>
              <li><strong>Creativity:</strong> Authentic Filipino concept with cultural relevance</li>
            </ul>
          </div>
          <div class="desc-subsection"><h5>🎯 Judging Criteria Alignment</h5>
            <ul>
              <li><strong>Functionality:</strong> Complete working application with all features</li>
              <li><strong>Creativity:</strong> Unique sari-sari store concept with Filipino culture</li>
              <li><strong>Usability:</strong> Beautiful, intuitive interface with excellent UX</li>
            </ul>
          </div>
        </div>`;
      } else {
        projectDescription.classList.remove('rich');
        projectDescription.textContent = data.description;
      }
    }
    if (projectTechStack) projectTechStack.innerHTML = data.technologies;
    
    // Update image counter
    if (currentImageNum) currentImageNum.textContent = '1';
    if (totalImagesNum) totalImagesNum.textContent = this.images.length.toString();

    // Show media controls (image slider or video)
    const prevBtn = document.querySelector('.project-gallery-prev') as HTMLElement;
    const nextBtn = document.querySelector('.project-gallery-next') as HTMLElement;
    const counter = document.querySelector('.project-gallery-counter') as HTMLElement;
    const projectVideo = document.getElementById('project-modal-video') as HTMLVideoElement;

    if (data.videoUrl) {
      // Hide slider controls when video is present
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (counter) counter.style.display = 'none';
    } else {
      if (this.images.length > 1) {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
        if (counter) counter.style.display = 'block';
      } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (counter) counter.style.display = 'none';
      }
    }

    // Handle GitHub link
    if (projectGithub) {
      if (data.githubUrl) {
        projectGithub.href = data.githubUrl;
        projectGithub.style.display = 'inline-flex';
      } else {
        projectGithub.style.display = 'none';
      }
    }

    // Handle Live Demo link
    if (projectLive) {
      if (data.liveUrl) {
        projectLive.href = data.liveUrl;
        projectLive.style.display = 'inline-flex';
      } else {
        projectLive.style.display = 'none';
      }
    }

    // Handle Codédex link (dynamic button)
    const codedexAnchor = document.querySelector('.project-codedex') as HTMLAnchorElement | null;
    if (codedexAnchor) {
      if (data.codedexUrl) {
        codedexAnchor.href = data.codedexUrl;
        codedexAnchor.style.display = 'inline-flex';
      } else {
        codedexAnchor.style.display = 'none';
      }
    }

    // Set initial media (video or image)
    if (data.videoUrl && projectVideo) {
      // Show video, hide image
      if (projectImage) {
        projectImage.style.display = 'none';
        projectImage.src = '';
        projectImage.classList.remove('image-error');
      }
      projectVideo.style.display = 'block';
      projectVideo.src = data.videoUrl;
      projectVideo.load();
    } else if (projectImage && this.images.length > 0) {
      // Show image, hide video
      if (projectVideo) {
        projectVideo.pause();
        projectVideo.removeAttribute('src');
        projectVideo.load();
        projectVideo.style.display = 'none';
      }
      projectImage.style.display = 'block';
      const firstSrc = this.images[0];
      const firstWebp = this.projectWebpImages[0] || '';
      const firstJpeg = this.projectJpegImages[0] || firstSrc;

      if (this.projectSourceWebpEl) {
        if (firstWebp) {
          this.projectSourceWebpEl.srcset = firstWebp;
          this.projectSourceWebpEl.sizes = '(max-width: 768px) 95vw, 70vw';
        } else {
          this.projectSourceWebpEl.removeAttribute('srcset');
          this.projectSourceWebpEl.removeAttribute('sizes');
        }
      }
      if (this.projectSourceJpegEl) {
        if (firstJpeg) {
          this.projectSourceJpegEl.srcset = firstJpeg;
          this.projectSourceJpegEl.sizes = '(max-width: 768px) 95vw, 70vw';
        } else {
          this.projectSourceJpegEl.removeAttribute('srcset');
          this.projectSourceJpegEl.removeAttribute('sizes');
        }
      }

      projectImage.src = firstSrc;
      projectImage.srcset = firstJpeg;
      projectImage.sizes = '(max-width: 768px) 95vw, 70vw';
      projectImage.alt = `${data.title} - Screenshot 1`;
    }

    // Show modal
    if (projectModal) {
      projectModal.style.display = 'flex';
      logger.log('Modal opened for project:', data.title);
    }
    
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  private closeProjectModal(): void {
    const projectModal = document.getElementById('projectModal');
    const projectVideo = document.getElementById('project-modal-video') as HTMLVideoElement | null;

    // Stop and reset video audio when closing modal
    if (projectVideo) {
      try {
        projectVideo.pause();
        projectVideo.currentTime = 0;
        projectVideo.removeAttribute('src');
        projectVideo.load();
        projectVideo.style.display = 'none';
      } catch (e) {
        logger.error('Error stopping project video on close:', e);
      }
    }

    if (projectModal) {
      projectModal.style.display = 'none';
    }
    document.body.style.overflow = ''; // Restore scrolling
  }

  private navigateProjectPrevious(): void {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateProjectImage();
  }

  private navigateProjectNext(): void {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateProjectImage();
  }

  private updateProjectImage(): void {
    const projectImage = document.getElementById('project-modal-image') as HTMLImageElement;
    const currentImageNum = document.querySelector('.current-image-number');
    
    if (!projectImage) return;
    
    const src = this.images[this.currentIndex] || '';
    const webpSrc = this.projectWebpImages[this.currentIndex] || '';
    const jpegSrc = this.projectJpegImages[this.currentIndex] || src;
    
    // Update image with fade effect
    projectImage.style.opacity = '0';
    setTimeout(() => {
      if (this.projectSourceWebpEl) {
        if (webpSrc) {
          this.projectSourceWebpEl.srcset = webpSrc;
          this.projectSourceWebpEl.sizes = '(max-width: 768px) 95vw, 70vw';
        } else {
          this.projectSourceWebpEl.removeAttribute('srcset');
          this.projectSourceWebpEl.removeAttribute('sizes');
        }
      }
      if (this.projectSourceJpegEl) {
        if (jpegSrc) {
          this.projectSourceJpegEl.srcset = jpegSrc;
          this.projectSourceJpegEl.sizes = '(max-width: 768px) 95vw, 70vw';
        } else {
          this.projectSourceJpegEl.removeAttribute('srcset');
          this.projectSourceJpegEl.removeAttribute('sizes');
        }
      }

      projectImage.src = src;
      projectImage.srcset = jpegSrc;
      projectImage.sizes = '(max-width: 768px) 95vw, 70vw';
      projectImage.onload = () => {
        requestAnimationFrame(() => {
          projectImage.style.opacity = '1';
        });
      };
    }, 150);

    // Update counter
    if (currentImageNum) {
      currentImageNum.textContent = (this.currentIndex + 1).toString();
    }
  }

  private displayTeammates(teammates?: Array<{name: string; role?: string}>): void {
    const teammatesSection = document.querySelector('.achievement-teammates') as HTMLElement;
    const teammatesList = document.querySelector('.teammates-list') as HTMLElement;
    
    if (!teammatesSection || !teammatesList) return;
    
    if (!teammates || teammates.length === 0) {
      teammatesSection.style.display = 'none';
      return;
    }
    
    teammatesSection.style.display = 'block';
    teammatesList.textContent = '';
    // Build teammate items using safe DOM APIs
    teammates.forEach((teammate) => {
      const initials = teammate.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      const teammateEl = document.createElement('div');
      teammateEl.className = 'teammate-item';
      
      const avatarEl = document.createElement('div');
      avatarEl.className = 'teammate-avatar';
      avatarEl.textContent = initials;
      
      const infoEl = document.createElement('div');
      infoEl.className = 'teammate-info';
      
      const nameEl = document.createElement('h5');
      nameEl.className = 'teammate-name';
      nameEl.textContent = teammate.name;
      infoEl.appendChild(nameEl);
      
      if (teammate.role) {
        const roleEl = document.createElement('p');
        roleEl.className = 'teammate-role';
        roleEl.textContent = teammate.role;
        infoEl.appendChild(roleEl);
      }
      
      teammateEl.appendChild(avatarEl);
      teammateEl.appendChild(infoEl);
      teammatesList.appendChild(teammateEl);
    });
  }

  private displayGithubButton(githubUrl?: string): void {
    const githubSection = document.querySelector('.achievement-github') as HTMLElement;
    
    if (!githubSection) return;
    
    if (!githubUrl) {
      githubSection.style.display = 'none';
      return;
    }
    
    githubSection.style.display = 'block';
    githubSection.textContent = '';
    const link = SecurityManager.createSafeAnchor(githubUrl, 'Visit Project on GitHub', 'github-button', true);
    const icon = document.createElement('ion-icon');
    icon.setAttribute('name', 'logo-github');
    link.prepend(icon);
    githubSection.appendChild(link);
  }

  public closeAchievementModal(): void {
    this.modalEl?.classList.remove('active');
    if (this.modalEl) {
      this.modalEl.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = ''; // Restore scrolling
  }

  public navigateAchievementPrevious(): void {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateImage();
  }

  public navigateAchievementNext(): void {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateImage();
  }

  private updateImage(): void {
    if (!this.imgEl) return;
    const img = this.imgEl;
    const src = this.images[this.currentIndex] || '';
    const webpSrc = this.achievementWebpImages[this.currentIndex] || '';
    const jpegSrc = this.achievementJpegImages[this.currentIndex] || src;
    
    // Show loading skeleton
    const slider = img.parentElement;
    if (slider) {
      this.showImageLoader(slider);
      // Also ensure any lingering error placeholders are removed
      const errorPlaceholder = slider.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
    }
    
    // Update <picture> sources before swapping image
    if (this.achievementSourceWebpEl) {
      if (webpSrc) {
        this.achievementSourceWebpEl.srcset = webpSrc;
        this.achievementSourceWebpEl.sizes = '(max-width: 768px) 90vw, 50vw';
      } else {
        this.achievementSourceWebpEl.removeAttribute('srcset');
        this.achievementSourceWebpEl.removeAttribute('sizes');
      }
    }
    if (this.achievementSourceJpegEl) {
      if (jpegSrc) {
        this.achievementSourceJpegEl.srcset = jpegSrc;
        this.achievementSourceJpegEl.sizes = '(max-width: 768px) 90vw, 50vw';
      } else {
        this.achievementSourceJpegEl.removeAttribute('srcset');
        this.achievementSourceJpegEl.removeAttribute('sizes');
      }
    }
    
    // Fade out, swap, fade in
    img.style.opacity = '0';
    img.style.display = 'block';
    setTimeout(() => {
      // Set fallback <img> for browsers without <picture> support
      img.src = src;
      img.srcset = jpegSrc;
      img.sizes = '(max-width: 768px) 90vw, 50vw';
      img.onload = () => {
        this.hideImageLoader(slider);
        requestAnimationFrame(() => (img.style.opacity = '1'));
      };
      img.onerror = () => {
        this.hideImageLoader(slider);
        logger.error('Failed to load image:', src);
        // Make sure image remains visible for a retry if needed
        img.style.display = 'block';
      };
    }, 120);
  }

  /**
   * Show image loading skeleton
   */
  private showImageLoader(container: HTMLElement | null): void {
    if (!container || container.querySelector('.image-loading-skeleton')) return;
    
    const skeleton = document.createElement('div');
    skeleton.className = 'image-loading-skeleton shimmer';
    skeleton.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        var(--eerie-black-1) 0%,
        var(--eerie-black-2) 50%,
        var(--eerie-black-1) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
      z-index: 5;
    `;
    
    container.appendChild(skeleton);
  }

  /**
   * Hide image loading skeleton
   */
  private hideImageLoader(container: HTMLElement | null): void {
    if (!container) return;
    
    const skeleton = container.querySelector('.image-loading-skeleton');
    if (skeleton) {
      skeleton.classList.add('fade-out');
      setTimeout(() => skeleton.remove(), 300);
    }
  }
}
