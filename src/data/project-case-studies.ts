import type { ProjectData } from '@/types';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderStructuredDescription(description?: string): string | null {
  if (!description) return null;
  const allowedLabels = new Set(['Recognition', 'Participation', 'Scope', 'Contribution', 'Purpose', 'Team', 'Build', 'Outcome']);
  const rows = description.split(/\r?\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = line.match(/^([A-Za-z ]+):\s*(.+)$/);
    if (!match || !allowedLabels.has(match[1].trim())) return null;
    return { label: match[1].trim(), body: match[2].trim() };
  });
  if (!rows.length || rows.some((row) => row === null)) return null;
  return `<div class="structured-description">${rows.map((row) => {
    const item = row as { label: string; body: string };
    return `<section class="structured-description-item"><span class="structured-description-label">${escapeHtml(item.label)}</span><p>${escapeHtml(item.body)}</p></section>`;
  }).join('')}</div>`;
}

/** Title-specific case-study presentation lives outside the modal controller. */
export function renderProjectDescription(projectDescription: HTMLElement, data: ProjectData): void {
    if (projectDescription) {
      const structuredDescription = renderStructuredDescription(data.description);
      if (structuredDescription) {
        projectDescription.classList.add('rich', 'structured');
        projectDescription.innerHTML = structuredDescription;
      } else {
      projectDescription.classList.remove('structured');
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
        projectDescription.innerHTML = `<div class="desc-section"><p>A web-based Loan Management System built with PHP and MySQL that streamlines the loan application process. It features secure user authentication, automated loan calculations, and real-time generation of repayment schedules. The system supports different user roles with specific interest rates and provides clear breakdowns of monthly dues and total payable amounts.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <h4>Features</h4>
          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon"><ion-icon name="shield-checkmark-outline"></ion-icon></div>
              <h5>Login System</h5>
              <ul>
                <li>Validates username & password (5 chars max).</li>
                <li>Real-time error feedback for invalid inputs.</li>
                <li>Secure session management.</li>
              </ul>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><ion-icon name="wallet-outline"></ion-icon></div>
              <h5>Loan Management</h5>
              <ul>
                <li>Flexible terms (6, 12, 24 months).</li>
                <li>Role-based interest (Officer: 5%, Member: 10%).</li>
                <li>Automated interest calculation.</li>
              </ul>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><ion-icon name="calculator-outline"></ion-icon></div>
              <h5>Financial Analysis</h5>
              <ul>
                <li>Total payable amount computation.</li>
                <li>Monthly due breakdown.</li>
                <li>Instant calculation updates.</li>
              </ul>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><ion-icon name="document-text-outline"></ion-icon></div>
              <h5>Workflow Control</h5>
              <ul>
                <li>Step-by-step application wizard.</li>
                <li>Confirmation & reset capabilities.</li>
                <li>Structured navigation flow.</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <h4>System Workflow</h4>
          <div class="workflow-timeline">
            <div class="workflow-step">
              <div class="workflow-step-marker">1</div>
              <div class="workflow-step-content">
                <h5><ion-icon name="log-in-outline"></ion-icon> Login Page</h5>
                <ul>
                  <li><strong>Input:</strong> Username & Password authentication.</li>
                  <li><strong>Validation:</strong> Checks against database records.</li>
                  <li><strong>Action:</strong> Redirects to Loan Amount on success.</li>
                </ul>
              </div>
            </div>
            <div class="workflow-step">
              <div class="workflow-step-marker">2</div>
              <div class="workflow-step-content">
                <h5><ion-icon name="cash-outline"></ion-icon> Loan Configuration</h5>
                <ul>
                  <li><strong>Input:</strong> Select Loan Amount & Repayment Term.</li>
                  <li><strong>Logic:</strong> Applies interest rate based on user role.</li>
                  <li><strong>Action:</strong> "Confirm Loan" to proceed.</li>
                </ul>
              </div>
            </div>
            <div class="workflow-step">
              <div class="workflow-step-marker">3</div>
              <div class="workflow-step-content">
                <h5><ion-icon name="analytics-outline"></ion-icon> Review Details</h5>
                <ul>
                  <li><strong>Display:</strong> Shows interest, total amount, & monthly dues.</li>
                  <li><strong>Decision:</strong> "Submit" to finalize or "Back" to modify.</li>
                </ul>
              </div>
            </div>
            <div class="workflow-step">
              <div class="workflow-step-marker">4</div>
              <div class="workflow-step-content">
                <h5><ion-icon name="checkmark-circle-outline"></ion-icon> Confirmation</h5>
                <ul>
                  <li><strong>Summary:</strong> Final overview of the approved loan.</li>
                  <li><strong>Complete:</strong> Return to login for next transaction.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technologies Used</h4><ul><li><strong>Backend:</strong> PHP</li><li><strong>Database:</strong> MySQL</li><li><strong>Frontend:</strong> HTML, CSS, Bootstrap</li><li><strong>Tools:</strong> XAMPP/WAMP (for local server setup)</li></ul></div>`;
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
        projectDescription.innerHTML = `<div class="desc-section"><p>FinanceWise is a comprehensive financial advisory platform designed to help users make informed decisions about spending, investments, and loans. Our platform combines modern design with practical financial tools to provide a seamless user experience. I won a dollar on this.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>SpendWise</h5>
              <ul>
                <li>Personalized spending advice based on your financial circumstances</li>
                <li>Smart budgeting recommendations</li>
                <li>Expense tracking and analysis</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>InvestWise</h5>
              <ul>
                <li>Customized investment suggestions</li>
                <li>Risk assessment tools</li>
                <li>Portfolio diversification guidance</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>LoanWise</h5>
              <ul>
                <li>Loan eligibility assessment</li>
                <li>Interest rate comparisons</li>
                <li>Repayment strategy planning</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Technologies Used</h4>
              <ul>
                <li>HTML5</li>
                <li>CSS3</li>
                <li>JavaScript</li>
                <li>Particles.js for interactive background</li>
                <li>Modern UI/UX principles</li>
                <li>Responsive Design</li>
              </ul>
            </div>
            <div class="tech-column">
              <h4>Design Features</h4>
              <ul>
                <li>Modern and intuitive user interface</li>
                <li>Responsive design for all devices</li>
                <li>Interactive particle background</li>
                <li>Smooth animations and transitions</li>
                <li>Professional color scheme</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Configuration</h4>
              <p>The project uses <strong>Particles.js</strong> for the interactive background. You can customize particle behavior by modifying the <code>particlesjs-config.json</code> file in the <code>loading</code> directory.</p>
            </div>
            <div class="tech-column">
              <h4>Responsive Design</h4>
              <p>FinanceWise is built with a mobile-first approach, ensuring a seamless experience across all devices:</p>
              <ul>
                <li>Desktop</li>
                <li>Tablet</li>
                <li>Mobile phones</li>
              </ul>
            </div>
          </div>
        </div>`;
      } else if (data.title.trim() === 'green-pulse' || data.title.includes('GreenPulse') || data.title.includes('Green Pulse')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section"><p>GreenPulse is an interactive web application designed to promote sustainability and eco-friendly practices. It provides users with tools to calculate their environmental impact, offers personalized eco-tips, and features various sustainability-related functionalities. Our platform combines modern technology with environmental awareness to empower users in their green journey.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>Track & Analyze</h5>
              <ul>
                <li>Sustainability Calculator to measure carbon footprint</li>
                <li>Visual progress tracking towards goals</li>
                <li>Data visualization with Chart.js</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>AI Assistance</h5>
              <ul>
                <li>Personalized AI-generated eco-tips</li>
                <li>Interactive chatbot for instant support</li>
                <li>Powered by Google Generative AI</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>User Experience</h5>
              <ul>
                <li>Interactive and user-friendly interface</li>
                <li>Engaging animations and effects</li>
                <li>Responsive design for all devices</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Technologies Used</h4>
              <ul>
                <li>React & Vite</li>
                <li>Google Generative AI</li>
                <li>Chart.js</li>
                <li>HTML5, CSS3, JavaScript</li>
              </ul>
            </div>
            <div class="tech-column">
              <h4>Design Features</h4>
              <ul>
                <li>Tailwind CSS styling</li>
                <li>Modern, clean aesthetic</li>
                <li>Responsive layout</li>
                <li>Smooth interactions</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Usage</h4><ul><li><strong>Sustainability Calculator:</strong> Fill in the form with your daily activities to calculate your carbon footprint.</li><li><strong>Eco Tips:</strong> Click on the "Get Eco Tip" button to receive a personalized tip.</li><li><strong>Chatbot:</strong> Use the chat feature to ask questions and get instant responses.</li></ul></div>`;
      } else if (data.title.trim() === 'Kita-Kita (Agentic)' || data.title.includes('Agentic')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section"><p>Kita-kita is a sophisticated AI-powered financial co-pilot designed to bridge the gap in personalized financial guidance for Filipinos. By combining advanced AI agents with a unified financial hub, it empowers users to manage debt, optimize cash flow, and build long-term wealth through data-driven insights and automated planning.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>AI Financial Agents</h5>
              <ul>
                <li><strong>Debt Demolisher:</strong> Automated debt-elimination plans</li>
                <li><strong>Cashflow Optimizer:</strong> Spending analysis & savings tips</li>
                <li><strong>Wealth Builder:</strong> Long-term investment guidance</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>Unified Hub</h5>
              <ul>
                <li>Multi-bank account & e-wallet management</li>
                <li>Seamless transaction tracking & categorization</li>
                <li>Recurring subscription monitoring</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>Analytics & Forecast</h5>
              <ul>
                <li>Real-time financial health visualization</li>
                <li>AI-powered expense forecasting</li>
                <li>Interactive charts & dashboards</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Technologies Used</h4>
              <ul>
                <li><strong>AI:</strong> Llama 3 (Local), AI Agents</li>
                <li><strong>Backend:</strong> Node.js, Express.js, Firebase</li>
                <li><strong>Frontend:</strong> HTML5, CSS3, JavaScript (ES6+)</li>
                <li><strong>Tools:</strong> Chart.js, Jest, Sentry</li>
              </ul>
            </div>
            <div class="tech-column">
              <h4>Design Features</h4>
              <ul>
                <li>Modern Dashboard UI</li>
                <li>Interactive Data Visualization</li>
                <li>Responsive Mobile-First Layout</li>
                <li>Secure Authentication Flow</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Usage Guide</h4>
          <div class="desc-subsection"><h5>Getting Started</h5>
            <ol>
              <li><strong>Sign Up/Login:</strong> Create an account or login.</li>
              <li><strong>Dashboard:</strong> View financial summary.</li>
              <li><strong>Setup:</strong> Add bank accounts/e-wallets.</li>
              <li><strong>Transact:</strong> Record income/expenses.</li>
              <li><strong>Agents:</strong> Use AI assistants below.</li>
            </ol>
          </div>
          <div class="desc-subsection"><h5>AI Agents</h5>
            <div class="usage-grid">
              <div class="usage-card">
                <h5>Debt Demolisher</h5>
                <p><em>Purpose:</em> Automated debt-elimination planning (Avalanche/Snowball).</p>
                <p><em>How to Test:</em></p>
                <ul>
                  <li>Link negative balance accounts.</li>
                  <li>Open agent to view plan.</li>
                </ul>
              </div>
              <div class="usage-card">
                <h5>Cashflow Optimizer</h5>
                <p><em>Purpose:</em> Analyzes spending & subscriptions.</p>
                <p><em>How to Test:</em></p>
                <ul>
                  <li>Log varied transactions.</li>
                  <li>Review savings tips.</li>
                </ul>
              </div>
              <div class="usage-card">
                <h5>Wealth Builder</h5>
                <p><em>Purpose:</em> Long-term investment guidance (PH context).</p>
                <p><em>How to Test:</em></p>
                <ul>
                  <li>Set up financial profile.</li>
                  <li>Ask for investment plan.</li>
                </ul>
              </div>
            </div>
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
      <div class="desc-subsection"><h5>The Kita Companions</h5>
        <div class="feature-grid">
          <div class="feature-column">
            <h5>Gabay Gastos</h5>
            <p><em>Financial Behavior Analysis</em></p>
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
          </div>

          <div class="feature-column">
            <h5>Dunong Puhunan</h5>
            <p><em>Investment Intelligence</em></p>
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
          </div>

          <div class="feature-column">
            <h5>Bantay Utang</h5>
            <p><em>Credit & Loan Manager</em></p>
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
          </div>

          <div class="feature-column">
            <h5>Iwas Scam</h5>
            <p><em>Fraud Protection</em></p>
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
          </div>

          <div class="feature-column">
            <h5>Tiwala Score</h5>
            <p><em>Credit Scoring</em></p>
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
          </div>

          <div class="feature-column">
            <h5>Patunay Check</h5>
            <p><em>Identity Verification</em></p>
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
          </div>
        </div>
      </div>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>Financial Health Analysis</h4>
      <ul>
        <li><strong>Real-time Analytics:</strong> Continuous monitoring of all financial activities</li>
        <li><strong>Risk Assessment:</strong> Multi-factor risk analysis across all companions</li>
        <li><strong>Personalized Insights:</strong> AI-driven recommendations based on financial patterns</li>
        <li><strong>Security Monitoring:</strong> Integrated security and fraud prevention</li>
        <li><strong>Compliance Tracking:</strong> Automated regulatory compliance monitoring</li>
      </ul>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>AI-Powered Integration</h4>
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
    <div class="desc-section"><h4>Features</h4>
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
    <div class="desc-section"><h4>Technology Stack</h4>
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
    <div class="desc-section"><h4>Prerequisites</h4>
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
        <div class="desc-section"><h4>Tech stack</h4>
          <ul>
            <li>React, TypeScript, Vite</li>
            <li>Node.js/Express for API</li>
            <li>Firebase (Auth, Firestore, Storage)</li>
            <li>ESLint, Prettier, Vitest</li>
            <li>Vercel / Docker for deployment</li>
          </ul>
        </div>`;
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
          <div class="desc-subsection"><h5>Performance Optimizations</h5>
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
  } else if (data.title.trim() === 'Four Fundamental Spaces Finder') {
    projectDescription.classList.add('rich');
    projectDescription.innerHTML = `<div class="desc-section">
      <p>${data.description}</p>
    </div>
    <hr class="desc-divider" />
    <div class="desc-section"><h4>Team Members</h4>
      <ul>
        <li>Castillejo, Paul Daniel C.</li>
        <li>Dotollo, Zyrah Mae M.</li>
        <li>Lozano, Mac Edison S.</li>
        <li>Magalona, Adriel M.</li>
        <li>Monterey, Reine Arabelle L.</li>
        <li>Puti, Jude Vincent F.</li>
      </ul>
    </div>`;
  } else if (data.title.trim() === 'WorkSight' || data.title.includes('WorkSight')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section"><p>WorkSight is an AI-powered employee well-being analytics platform that gives leaders foresight, not hindsight. By combining behavioral data with psychological science, it addresses the critical issue of burnout, turning an invisible threat into a measurable, preventable business risk.</p></div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>Predictive Analytics</h5>
              <ul>
                <li>Analyzes workload & collaboration patterns</li>
                <li>Forecasts burnout risk before it escalates</li>
                <li>Data-driven decision support</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>Psychological Insights</h5>
              <ul>
                <li>Integrates behavioral psychology models</li>
                <li>Contextualizes raw data into human metrics</li>
                <li>Promotes healthier work habits</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>Proactive Management</h5>
              <ul>
                <li>Actionable recommendations for leaders</li>
                <li>Real-time team health monitoring</li>
                <li>Prevents productivity loss</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Technologies Used</h4>
              <ul>
                <li><strong>Frontend:</strong> Next.js, React, TypeScript</li>
                <li><strong>Backend:</strong> Supabase (Auth, DB, Realtime)</li>
                <li><strong>Data:</strong> Behavioral Analysis Algorithms</li>
                <li><strong>Architecture:</strong> Monorepo</li>
              </ul>
            </div>
            <div class="tech-column">
              <h4>Impact & Recognition</h4>
              <ul>
                <li><strong>3rd Place:</strong> BPI DataWave Hackathon 2025</li>
                <li><strong>Economic:</strong> Addresses $1T annual burnout cost</li>
                <li><strong>Human:</strong> Improves employee retention & well-being</li>
              </ul>
            </div>
          </div>
        </div>`;
      } else if (data.title.trim() === 'Online Document Request System' || data.title.includes('Document Request')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section">
          <p>A comprehensive web-based platform that streamlines the process of requesting and managing school documents for Grade 12 students at the University of Makati Higher School (HS ng UMak).</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Key Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>🔐 User Authentication</h5>
              <ul>
                <li>Secure login system for students</li>
                <li>Role-based access control</li>
                <li>Password-protected accounts</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>📄 Document Management</h5>
              <ul>
                <li>Request various school documents</li>
                <li>Track request status in real-time</li>
                <li>View request history</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>⚙️ Admin Controls</h5>
              <ul>
                <li>Process document requests</li>
                <li>Update request statuses</li>
                <li>Manage student records</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>System Workflow</h4>
          <div class="workflow-timeline">
            <div class="workflow-step">
              <div class="workflow-step-marker">1</div>
              <div class="workflow-step-content">
                <h5>Student Login</h5>
                <p>Students authenticate with their credentials to access the system.</p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="workflow-step-marker">2</div>
              <div class="workflow-step-content">
                <h5>Submit Request</h5>
                <p>Select document type and fill in required details.</p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="workflow-step-marker">3</div>
              <div class="workflow-step-content">
                <h5>Admin Processing</h5>
                <p>Administrators review and process the request.</p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="workflow-step-marker">4</div>
              <div class="workflow-step-content">
                <h5>Status Updates</h5>
                <p>Real-time notifications on request progress.</p>
              </div>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Technologies</h4>
              <ul>
                <li><strong>Backend:</strong> PHP</li>
                <li><strong>Database:</strong> MySQL</li>
                <li><strong>Frontend:</strong> HTML, CSS, JavaScript</li>
                <li><strong>Framework:</strong> Bootstrap</li>
              </ul>
            </div>
            <div class="tech-column">
              <h4>Benefits</h4>
              <ul>
                <li>Eliminates manual paperwork</li>
                <li>Reduces processing time</li>
                <li>Transparent request tracking</li>
                <li>Accessible anytime, anywhere</li>
              </ul>
            </div>
          </div>
        </div>`;
      } else if (data.title.trim() === 'Merc Airline Ticketing System' || data.title.includes('Merc Airline')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section">
          <p>A student-built C++ console application that implements a complete airline reservation workflow. The system demonstrates end-to-end booking and pricing logic suitable for study, refactoring, or extension.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Core Functionalities</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>✈️ Flight Operations</h5>
              <ul>
                <li>Search available flights</li>
                <li>View flight schedules</li>
                <li>Check seat availability</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>🎫 Booking System</h5>
              <ul>
                <li>Book and reserve flights</li>
                <li>Manage passenger records</li>
                <li>Generate booking confirmations</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>💰 Fare Calculation</h5>
              <ul>
                <li>Automatic fare computation</li>
                <li>Tax and VAT inclusion</li>
                <li>Discount application</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technical Highlights</h4>
          <ul>
            <li><strong>Language:</strong> C++ (single-source file implementation)</li>
            <li><strong>Architecture:</strong> Console-based user interface</li>
            <li><strong>Purpose:</strong> Educational project demonstrating OOP concepts</li>
            <li><strong>Features:</strong> Simulated payment transactions</li>
          </ul>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Learning Outcomes</h4>
          <ul>
            <li>Object-oriented programming in C++</li>
            <li>Data structures for record management</li>
            <li>User input validation and error handling</li>
            <li>Business logic implementation</li>
          </ul>
        </div>`;
      } else if (data.title.trim() === 'YouTube Layout' || data.title.includes('YouTube Layout')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section">
          <p>A responsive HTML and CSS recreation of the YouTube interface, developed as part of my first-year Introduction to Computer Science course.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Project Highlights</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>🎨 Layout Recreation</h5>
              <ul>
                <li>Accurate YouTube-style design</li>
                <li>Video thumbnail grid</li>
                <li>Navigation sidebar</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>📱 Responsive Design</h5>
              <ul>
                <li>Mobile-friendly layout</li>
                <li>Flexible grid system</li>
                <li>Adaptive components</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Technologies</h4>
              <ul>
                <li><strong>HTML5:</strong> Semantic markup</li>
                <li><strong>CSS3:</strong> Flexbox & Grid</li>
              </ul>
            </div>
            <div class="tech-column">
              <h4>Skills Demonstrated</h4>
              <ul>
                <li>UI/UX design principles</li>
                <li>CSS layout techniques</li>
                <li>Web fundamentals</li>
              </ul>
            </div>
          </div>
        </div>`;
      } else if (data.title.trim() === 'Talambuhay' || data.title.includes('Talambuhay')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section">
          <p>A web-based translation and biography platform built with JavaScript and TypeScript. Deployed on Vercel as a modern frontend application.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Key Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>🌐 Translation</h5>
              <ul>
                <li>Multi-language support</li>
                <li>Real-time translation</li>
                <li>User-friendly interface</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>Biography</h5>
              <ul>
                <li>Personal story presentation</li>
                <li>Interactive timeline</li>
                <li>Rich media content</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>🎯 User Experience</h5>
              <ul>
                <li>Clean, modern design</li>
                <li>Smooth animations</li>
                <li>Responsive layout</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Technologies</h4>
              <ul>
                <li><strong>Primary:</strong> JavaScript, TypeScript</li>
                <li><strong>Markup:</strong> HTML, CSS</li>
                <li><strong>Runtime:</strong> Node.js</li>
                <li><strong>Deployment:</strong> Vercel</li>
              </ul>
            </div>
            <div class="tech-column">
              <h4>Project Structure</h4>
              <ul>
                <li>src/ - Source files</li>
                <li>pages/ - Route components</li>
                <li>api/ - Backend endpoints</li>
                <li>app/ - App configuration</li>
              </ul>
            </div>
          </div>
        </div>`;
      } else if (data.title.trim() === 'BarangayNav' || data.title.includes('BarangayNav')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section">
          <p>A transparent platform for navigating barangay services, powered by AI assistance and real-time tracking to support accountable governance in the Philippines.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Key Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>AI Guidance</h5>
              <ul>
                <li>Powered by Gemini AI</li>
                <li>Service inquiry assistance</li>
                <li>24/7 automated support</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>📋 Service Info</h5>
              <ul>
                <li>Clear requirements listing</li>
                <li>Transparent fee disclosure</li>
                <li>Processing timelines</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>🎨 Modern Design</h5>
              <ul>
                <li>Dark theme with glassmorphism</li>
                <li>Responsive across devices</li>
                <li>Intuitive navigation</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technical Implementation</h4>
          <ul>
            <li><strong>Frontend:</strong> HTML, CSS, TypeScript, Angular</li>
            <li><strong>AI:</strong> Google Gemini for intelligent responses</li>
            <li><strong>Security:</strong> Environment-based API key management</li>
            <li><strong>Architecture:</strong> Modern SPA with real-time updates</li>
          </ul>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Impact</h4>
          <p>BarangayNav aims to bridge the gap between citizens and local government units by providing transparent, accessible information about barangay services, promoting accountable governance and reducing bureaucratic friction.</p>
        </div>`;
      } else if (data.title.trim() === 'LingapLink' || data.title.includes('LingapLink')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section">
          <p>A comprehensive, modern healthcare platform designed to revolutionize the connection between patients and healthcare providers. Built with cutting-edge web technologies focusing on security, accessibility, and user experience.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Core Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>🏥 Patient Portal</h5>
              <ul>
                <li>Appointment scheduling</li>
                <li>Medical records access</li>
                <li>Prescription management</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>👨‍⚕️ Provider Tools</h5>
              <ul>
                <li>Patient management</li>
                <li>Digital health records</li>
                <li>Secure messaging</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>AI Assistance</h5>
              <ul>
                <li>Intelligent automation</li>
                <li>Natural language processing</li>
                <li>Smart recommendations</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Technology Stack</h4>
          <div class="tech-design-grid">
            <div class="tech-column">
              <h5>Frontend</h5>
              <ul>
                <li><strong>React 18:</strong> Modern UI framework</li>
                <li><strong>TypeScript:</strong> Type-safe development</li>
                <li><strong>Vite:</strong> Fast build tool</li>
                <li><strong>Recharts:</strong> Data visualization</li>
              </ul>
            </div>
            <div class="tech-column">
              <h5>Backend</h5>
              <ul>
                <li><strong>Node.js & Express:</strong> Server framework</li>
                <li><strong>Firebase:</strong> Auth & Firestore</li>
                <li><strong>Gemini:</strong> AI/ML services</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Design Philosophy</h4>
          <ul>
            <li><strong>Security First:</strong> HIPAA-conscious design principles</li>
            <li><strong>Accessibility:</strong> WCAG-compliant interface</li>
            <li><strong>User-Centric:</strong> Intuitive workflows for all users</li>
            <li><strong>Scalable:</strong> Built to grow with healthcare needs</li>
          </ul>
        </div>`;
      } else if (data.title.trim() === 'Fireside september' || data.title.toLowerCase().includes('fireside')) {
        projectDescription.classList.add('rich');
        projectDescription.innerHTML = `<div class="desc-section">
          <p>A compact autumn-themed mobile experience that blends seasonal warmth with productivity. Built with Flutter and Dart, featuring a cozy aesthetic with pixel-art accents and smooth animations.</p>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Features</h4>
          <div class="feature-grid">
            <div class="feature-column">
              <h5>🎴 Trivia Cards</h5>
              <ul>
                <li>Flip-style interaction</li>
                <li>Subtle reveal animations</li>
                <li>Autumn-themed content</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>⏱️ Pomodoro Timer</h5>
              <ul>
                <li>Configurable sessions</li>
                <li>Ambient sounds (rain, fire)</li>
                <li>Focus-friendly design</li>
              </ul>
            </div>
            <div class="feature-column">
              <h5>🍯 Honey Hazel</h5>
              <ul>
                <li>AI-powered assistant</li>
                <li>Mood-based recipes</li>
                <li>Powered by Gemini</li>
              </ul>
            </div>
          </div>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section"><h4>Additional Features</h4>
          <ul>
            <li><strong>🍂 Autumn Bucket List:</strong> Gamified activities with points for completion</li>
            <li><strong>🔥 Custom Fireplace:</strong> Sound and visual modes including colorful magic mode</li>
            <li><strong>🎨 UI Effects:</strong> Parallax leaves, scatter effects, pixel-art accents</li>
            <li><strong>📱 Custom Icon:</strong> Unique autumn-themed app icon</li>
          </ul>
        </div>
        <hr class="desc-divider" />
        <div class="desc-section">
          <div class="tech-design-grid">
            <div class="tech-column">
              <h4>Technologies</h4>
              <ul>
                <li><strong>Framework:</strong> Flutter & Dart</li>
                <li><strong>AI:</strong> Gemini (Honey Hazel)</li>
                <li><strong>Audio:</strong> audioplayers package</li>
                <li><strong>Icons:</strong> flutter_launcher_icons</li>
              </ul>
            </div>
            <div class="tech-column">
              <h4>Design Elements</h4>
              <ul>
                <li>Warm autumn color palette</li>
                <li>Cozy, seasonal aesthetic</li>
                <li>Smooth animations</li>
                <li>Pixel-art accents</li>
              </ul>
            </div>
          </div>
        </div>`;
      } else {
        projectDescription.classList.remove('rich');
        projectDescription.textContent = data.description;
      }
      }
    }

}
