#!/usr/bin/env python3
"""
CSS Modularization Script
Intelligently splits the monolithic style.css into modular CSS files
"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

class CSSModularizer:
    def __init__(self, source_file: str, target_dir: str):
        self.source_file = Path(source_file)
        self.target_dir = Path(target_dir)
        self.css_content = self.source_file.read_text()
        
        # Define the modular file structure
        self.modules = {
            'base/_variables.css': [],
            'base/_reset.css': [],
            'base/_typography.css': [],
            'layout/_sidebar.css': [],
            'layout/_navbar.css': [],
            'layout/_main.css': [],
            'components/_cards.css': [],
            'components/_modal.css': [],
            'components/_timeline.css': [],
            'components/_achievements.css': [],
            'components/_projects.css': [],
            'components/_organizations.css': [],
            'components/_chatbot.css': [],
            'components/_loading.css': [],
            'utilities/_animations.css': [],
            'utilities/_common.css': [],
            'responsive/_breakpoints.css': []
        }
    
    def extract_root_variables(self) -> str:
        """Extract :root CSS variables"""
        match = re.search(r':root\s*{[^}]+}', self.css_content, re.DOTALL)
        return match.group(0) if match else ''
    
    def categorize_rule(self, rule: str) -> str:
        """Determine which module a CSS rule belongs to"""
        rule_lower = rule.lower()
        
        # Check for specific patterns
        patterns = {
            'base/_reset.css': [
                r'^\*[\s,]', r'\*::before', r'\*::after', r'^html\s', r'^body\s',
                r'^a\s*{', r'^li\s*{', r'^img\s', r'^button\s', r'^input\s', 
                r'^textarea\s', r'::selection', r':focus\s'
            ],
            'base/_typography.css': [
                r'\.h2', r'\.h3', r'\.h4', r'\.h5', r'\.article-title',
                r'font-family', r'font-size', r'font-weight'
            ],
            'layout/_sidebar.css': [
                r'\.sidebar', r'\.info', r'\.contacts', r'\.contact-item',
                r'\.avatar-box', r'\.info-content', r'\.social-list'
            ],
            'layout/_navbar.css': [
                r'\.navbar', r'\.navbar-list', r'\.navbar-link', r'nav\s'
            ],
            'layout/_main.css': [
                r'\.main-content', r'^main\s', r'\.container'
            ],
            'components/_modal.css': [
                r'\.modal', r'\.modal-container', r'\.modal-content',
                r'\.modal-img', r'\.overlay'
            ],
            'components/_timeline.css': [
                r'\.timeline', r'\.timeline-list', r'\.timeline-item',
                r'\.timeline-text'
            ],
            'components/_achievements.css': [
                r'\.achievement', r'\.award', r'\.honors'
            ],
            'components/_projects.css': [
                r'\.project', r'\.filter-list', r'\.filter-item',
                r'\.project-list', r'\.project-item', r'\.project-img'
            ],
            'components/_organizations.css': [
                r'\.organization', r'\.org-list', r'\.org-item'
            ],
            'components/_chatbot.css': [
                r'\.chatbot', r'\.chat-', r'\.message-'
            ],
            'components/_loading.css': [
                r'\.skeleton', r'\.shimmer', r'\.loading', r'\.spinner',
                r'@keyframes shimmer', r'@keyframes spin'
            ],
            'components/_cards.css': [
                r'\.card', r'\.service', r'\.testimonial', r'\.blog-post'
            ],
            'utilities/_animations.css': [
                r'@keyframes', r'\.fade', r'\.slide', r'\.bounce', r'\.pulse',
                r'animation:'
            ],
            'utilities/_common.css': [
                r'\.separator', r'\.icon-box', r'\.content-card', r'\.has-scrollbar'
            ],
            'responsive/_breakpoints.css': [
                r'@media'
            ]
        }
        
        # Check each pattern
        for module, pattern_list in patterns.items():
            for pattern in pattern_list:
                if re.search(pattern, rule, re.IGNORECASE | re.MULTILINE):
                    return module
        
        # Default fallback
        return 'utilities/_common.css'
    
    def split_css(self):
        """Split CSS into logical chunks"""
        # Extract variables first
        variables = self.extract_root_variables()
        if variables:
            self.modules['base/_variables.css'].append(variables)
        
        # Remove variables from content for further processing
        remaining_css = re.sub(r':root\s*{[^}]+}', '', self.css_content, flags=re.DOTALL)
        
        # Split by rules (keeping comments with their rules)
        # Match CSS rules including comments before them
        pattern = r'(?:/\*.*?\*/\s*)*((?:[^{}]+\{[^{}]*\})|(?:@keyframes[^{]+\{(?:[^{}]+\{[^{}]*\})*\}))'
        rules = re.findall(pattern, remaining_css, re.DOTALL)
        
        # Categorize each rule
        for rule in rules:
            if rule.strip():
                module = self.categorize_rule(rule)
                self.modules[module].append(rule)
        
        # Special handling: extract all @media queries for responsive
        media_queries = re.findall(r'@media[^{]+\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', 
                                   self.css_content, re.DOTALL)
        if media_queries:
            self.modules['responsive/_breakpoints.css'] = media_queries
    
    def write_modules(self):
        """Write the modular CSS files"""
        for module_path, content_list in self.modules.items():
            if content_list:
                full_path = self.target_dir / module_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Join content with double newlines
                content = '\n\n'.join(content_list)
                
                # Clean up multiple newlines
                content = re.sub(r'\n{3,}', '\n\n', content)
                
                full_path.write_text(content.strip() + '\n')
                print(f"✓ Created {module_path} ({len(content)} bytes)")
    
    def create_main_css(self):
        """Create the main.css file with imports"""
        imports = [
            "/* Base Styles */",
            "@import './base/_variables.css';",
            "@import './base/_reset.css';",
            "@import './base/_typography.css';",
            "",
            "/* Layout */",
            "@import './layout/_sidebar.css';",
            "@import './layout/_navbar.css';",
            "@import './layout/_main.css';",
            "",
            "/* Components */",
            "@import './components/_cards.css';",
            "@import './components/_modal.css';",
            "@import './components/_timeline.css';",
            "@import './components/_achievements.css';",
            "@import './components/_projects.css';",
            "@import './components/_organizations.css';",
            "@import './components/_chatbot.css';",
            "@import './components/_loading.css';",
            "",
            "/* Utilities */",
            "@import './utilities/_common.css';",
            "@import './utilities/_animations.css';",
            "",
            "/* Responsive */",
            "@import './responsive/_breakpoints.css';",
        ]
        
        main_css_path = self.target_dir / 'main.css'
        main_css_path.write_text('\n'.join(imports) + '\n')
        print(f"✓ Created main.css with imports")
    
    def run(self):
        """Execute the modularization"""
        print("🚀 Starting CSS modularization...")
        print(f"📄 Source: {self.source_file}")
        print(f"📁 Target: {self.target_dir}")
        print()
        
        self.split_css()
        self.write_modules()
        self.create_main_css()
        
        print()
        print("✅ CSS modularization complete!")
        print()
        print("Next steps:")
        print("1. Import './styles/main.css' in src/main.ts")
        print("2. Remove <link> tags for style.css from index.html")
        print("3. Test the site")
        print("4. Delete style.css and style.css.backup")


if __name__ == '__main__':
    source = '/Users/adrielmagalona/Desktop/portfolio/style.css'
    target = '/Users/adrielmagalona/Desktop/portfolio/src/styles'
    
    modularizer = CSSModularizer(source, target)
    modularizer.run()
