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
  private titleEl: HTMLElement | null = null;
  private organizerEl: HTMLElement | null = null;
  private dateLocEl: HTMLElement | null = null;
  private images: string[] = [];
  private currentIndex = 0;

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

    // Cache achievement modal elements
    this.modalEl = document.getElementById('achievementModal');
    this.imgEl = document.querySelector('.achievement-slide-image');
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
    
    // Use WebP if supported, fallback to regular images
    const supportsWebp = document.documentElement.classList.contains('webp');
    this.images = supportsWebp && data.webpImages.length > 0 ? data.webpImages : data.images;
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
        this.imgEl.setAttribute('loading', 'eager');
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
    this.images = supportsWebp && data.webpImages.length > 0 ? data.webpImages : data.images;
    this.currentIndex = 0;

    // Get project modal elements
    const projectModal = document.getElementById('projectModal');
    const projectImage = document.getElementById('project-modal-image') as HTMLImageElement;
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
      projectImage.src = this.images[0];
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
    
    // Update image with fade effect
    projectImage.style.opacity = '0';
    setTimeout(() => {
      projectImage.src = src;
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
    
    // Show loading skeleton
    const slider = img.parentElement;
    if (slider) {
      this.showImageLoader(slider);
      // Also ensure any lingering error placeholders are removed
      const errorPlaceholder = slider.querySelector('.image-error-placeholder');
      if (errorPlaceholder) errorPlaceholder.remove();
    }
    
    // Fade out, swap, fade in
    img.style.opacity = '0';
    img.style.display = 'block';
    setTimeout(() => {
      img.src = src;
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
