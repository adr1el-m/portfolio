#!/usr/bin/env python3
"""
Production Build Script for Portfolio
Minifies CSS and JavaScript, removes unused code, and optimizes for production
"""

import os
import re
import json
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urljoin

class ProductionBuilder:
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir)
        self.dist_dir = self.base_dir / "dist"
        self.stats = {
            "original_sizes": {},
            "minified_sizes": {},
            "compression_ratios": {}
        }
        
    def create_dist_directory(self):
        """Create clean distribution directory"""
        if self.dist_dir.exists():
            shutil.rmtree(self.dist_dir)
        
        # Create directory structure
        directories = [
            self.dist_dir,
            self.dist_dir / "public" / "images",
            self.dist_dir / "public" / "optimized",
            self.dist_dir / "public" / "achievements",
            self.dist_dir / "public" / "files"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            
        print("✅ Created clean distribution directory")
        
    def analyze_css_usage(self, css_content, html_content):
        """Analyze which CSS rules are actually used in the HTML"""
        used_selectors = set()
        unused_selectors = set()
        
        # Extract all CSS selectors
        css_selectors = re.findall(r'([.#]?[a-zA-Z_-][a-zA-Z0-9_-]*(?:\[[^\]]*\])?(?:::[a-zA-Z-]+)?(?:\s*[,>+~]\s*[a-zA-Z_-][a-zA-Z0-9_-]*)*)\s*{', css_content)
        
        # Extract classes and IDs from HTML
        html_classes = set(re.findall(r'class="([^"]*)"', html_content))
        html_ids = set(re.findall(r'id="([^"]*)"', html_content))
        
        # Flatten class lists
        all_html_classes = set()
        for class_list in html_classes:
            all_html_classes.update(class_list.split())
            
        # Check selector usage
        for selector in css_selectors:
            selector_clean = selector.strip()
            
            # Skip media queries, keyframes, and other at-rules
            if selector_clean.startswith(('@', 'from', 'to', '0%', '100%')):
                used_selectors.add(selector)
                continue
                
            # Check if selector is used
            is_used = False
            
            # Check for class selectors
            if '.' in selector_clean:
                class_matches = re.findall(r'\.([a-zA-Z_-][a-zA-Z0-9_-]*)', selector_clean)
                for class_name in class_matches:
                    if class_name in all_html_classes:
                        is_used = True
                        break
                        
            # Check for ID selectors
            if '#' in selector_clean:
                id_matches = re.findall(r'#([a-zA-Z_-][a-zA-Z0-9_-]*)', selector_clean)
                for id_name in id_matches:
                    if id_name in html_ids:
                        is_used = True
                        break
                        
            # Check for element selectors
            if not selector_clean.startswith(('.', '#')):
                element_name = selector_clean.split()[0].split(':')[0].split('[')[0]
                if element_name in ['html', 'body', 'main', 'article', 'section', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'img', 'button', 'input', 'textarea', 'form', 'nav', 'header', 'footer', 'aside', 'ul', 'li', 'figure', 'picture', 'source']:
                    is_used = True
                    
            if is_used:
                used_selectors.add(selector)
            else:
                unused_selectors.add(selector)
                
        return used_selectors, unused_selectors
        
    def remove_unused_css(self, css_content, html_content):
        """Remove unused CSS rules"""
        print("🔍 Analyzing CSS usage...")
        
        used_selectors, unused_selectors = self.analyze_css_usage(css_content, html_content)
        
        # Remove unused CSS rules (conservative approach)
        lines = css_content.split('\n')
        cleaned_lines = []
        skip_rule = False
        
        for line in lines:
            # Check if line contains a selector
            if '{' in line and not skip_rule:
                selector_match = re.match(r'^([^{]+){', line.strip())
                if selector_match:
                    selector = selector_match.group(1).strip()
                    # Only remove if we're confident it's unused
                    if (selector in unused_selectors and 
                        not any(keyword in selector.lower() for keyword in ['hover', 'focus', 'active', 'before', 'after', 'media', 'keyframes', 'root', '*'])):
                        skip_rule = True
                        continue
                        
            if skip_rule and '}' in line:
                skip_rule = False
                continue
                
            if not skip_rule:
                cleaned_lines.append(line)
                
        print(f"   📊 Found {len(unused_selectors)} potentially unused selectors")
        print(f"   ♻️  Conservatively removed unused rules")
        
        return '\n'.join(cleaned_lines)
        
    def minify_css(self, css_content):
        """Minify CSS content"""
        print("🗜️  Minifying CSS...")
        
        # Remove comments
        css_content = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
        
        # Remove unnecessary whitespace
        css_content = re.sub(r'\s+', ' ', css_content)
        css_content = re.sub(r'\s*{\s*', '{', css_content)
        css_content = re.sub(r'\s*}\s*', '}', css_content)
        css_content = re.sub(r'\s*;\s*', ';', css_content)
        css_content = re.sub(r'\s*:\s*', ':', css_content)
        css_content = re.sub(r'\s*,\s*', ',', css_content)
        
        # Remove trailing semicolons before }
        css_content = re.sub(r';}', '}', css_content)
        
        # Remove empty rules
        css_content = re.sub(r'[^}]+{\s*}', '', css_content)
        
        return css_content.strip()
        
    def minify_javascript(self, js_content):
        """Minify JavaScript content"""
        print("🗜️  Minifying JavaScript...")
        
        # Remove single-line comments (but preserve URLs)
        js_content = re.sub(r'(?<!:)//(?![/\s]*http).*$', '', js_content, flags=re.MULTILINE)
        
        # Remove multi-line comments
        js_content = re.sub(r'/\*.*?\*/', '', js_content, flags=re.DOTALL)
        
        # Remove unnecessary whitespace
        js_content = re.sub(r'\s+', ' ', js_content)
        js_content = re.sub(r'\s*{\s*', '{', js_content)
        js_content = re.sub(r'\s*}\s*', '}', js_content)
        js_content = re.sub(r'\s*;\s*', ';', js_content)
        js_content = re.sub(r'\s*,\s*', ',', js_content)
        js_content = re.sub(r'\s*\(\s*', '(', js_content)
        js_content = re.sub(r'\s*\)\s*', ')', js_content)
        
        # Remove console.log statements (optional)
        js_content = re.sub(r'console\.log\([^)]*\);?', '', js_content)
        
        return js_content.strip()
        
    def optimize_html(self, html_content):
        """Optimize HTML content"""
        print("🗜️  Optimizing HTML...")
        
        # Remove HTML comments (but preserve IE conditionals)
        html_content = re.sub(r'<!--(?!\[if).*?-->', '', html_content, flags=re.DOTALL)
        
        # Remove unnecessary whitespace between tags
        html_content = re.sub(r'>\s+<', '><', html_content)
        
        # Remove extra whitespace
        html_content = re.sub(r'\s+', ' ', html_content)
        
        return html_content.strip()
        
    def update_asset_references(self, html_content):
        """Update HTML to reference minified assets"""
        # Update CSS reference
        html_content = html_content.replace('href="style.css"', 'href="style.min.css"')
        
        # Update JS reference  
        html_content = html_content.replace('src="script.js"', 'src="script.min.js"')
        
        return html_content
        
    def copy_assets(self):
        """Copy static assets to dist directory"""
        print("📁 Copying static assets...")
        
        # Copy public directory
        if (self.base_dir / "public").exists():
            shutil.copytree(self.base_dir / "public", self.dist_dir / "public", dirs_exist_ok=True)
            
        # Copy other static files
        static_files = ["robots.txt", "manifest.json"]
        for file_name in static_files:
            file_path = self.base_dir / file_name
            if file_path.exists():
                shutil.copy2(file_path, self.dist_dir / file_name)
                
        print("   ✅ Static assets copied")
        
    def generate_cache_busting_hashes(self):
        """Generate cache-busting hashes for assets"""
        import hashlib
        
        hashes = {}
        
        # Generate hash for CSS
        css_file = self.dist_dir / "style.min.css"
        if css_file.exists():
            with open(css_file, 'rb') as f:
                content = f.read()
                hash_value = hashlib.md5(content).hexdigest()[:8]
                hashes['css'] = hash_value
                
        # Generate hash for JS
        js_file = self.dist_dir / "script.min.js"
        if js_file.exists():
            with open(js_file, 'rb') as f:
                content = f.read()
                hash_value = hashlib.md5(content).hexdigest()[:8]
                hashes['js'] = hash_value
                
        return hashes
        
    def build_production(self):
        """Run complete production build"""
        print("🚀 Starting production build...")
        print("=" * 50)
        
        # Create distribution directory
        self.create_dist_directory()
        
        # Read source files
        html_content = (self.base_dir / "index.html").read_text(encoding='utf-8')
        css_content = (self.base_dir / "style.css").read_text(encoding='utf-8')
        js_content = (self.base_dir / "script.js").read_text(encoding='utf-8')
        
        # Record original sizes
        self.stats["original_sizes"]["html"] = len(html_content)
        self.stats["original_sizes"]["css"] = len(css_content)
        self.stats["original_sizes"]["js"] = len(js_content)
        
        # Remove unused CSS
        css_content = self.remove_unused_css(css_content, html_content)
        
        # Minify assets
        minified_css = self.minify_css(css_content)
        minified_js = self.minify_javascript(js_content)
        optimized_html = self.optimize_html(html_content)
        
        # Update asset references
        optimized_html = self.update_asset_references(optimized_html)
        
        # Record minified sizes
        self.stats["minified_sizes"]["html"] = len(optimized_html)
        self.stats["minified_sizes"]["css"] = len(minified_css)
        self.stats["minified_sizes"]["js"] = len(minified_js)
        
        # Calculate compression ratios
        for asset in ["html", "css", "js"]:
            original = self.stats["original_sizes"][asset]
            minified = self.stats["minified_sizes"][asset]
            ratio = ((original - minified) / original) * 100
            self.stats["compression_ratios"][asset] = ratio
            
        # Write minified files
        (self.dist_dir / "index.html").write_text(optimized_html, encoding='utf-8')
        (self.dist_dir / "style.min.css").write_text(minified_css, encoding='utf-8')
        (self.dist_dir / "script.min.js").write_text(minified_js, encoding='utf-8')
        
        # Copy static assets
        self.copy_assets()
        
        # Generate build report
        self.generate_build_report()
        
        print("\n🎉 Production build completed successfully!")
        print(f"📁 Output directory: {self.dist_dir}")
        
    def generate_build_report(self):
        """Generate build statistics report"""
        print("\n" + "=" * 50)
        print("📊 BUILD OPTIMIZATION REPORT")
        print("=" * 50)
        
        for asset in ["html", "css", "js"]:
            original = self.stats["original_sizes"][asset]
            minified = self.stats["minified_sizes"][asset]
            ratio = self.stats["compression_ratios"][asset]
            
            print(f"{asset.upper()}:")
            print(f"  Original:  {original:,} bytes ({original/1024:.1f}KB)")
            print(f"  Minified:  {minified:,} bytes ({minified/1024:.1f}KB)")
            print(f"  Saved:     {original-minified:,} bytes ({ratio:.1f}%)")
            print()
            
        total_original = sum(self.stats["original_sizes"].values())
        total_minified = sum(self.stats["minified_sizes"].values())
        total_saved = total_original - total_minified
        total_ratio = (total_saved / total_original) * 100
        
        print(f"TOTAL:")
        print(f"  Original:  {total_original:,} bytes ({total_original/1024:.1f}KB)")
        print(f"  Minified:  {total_minified:,} bytes ({total_minified/1024:.1f}KB)")
        print(f"  Saved:     {total_saved:,} bytes ({total_ratio:.1f}%)")
        print("=" * 50)
        
        # Save stats to file
        stats_file = self.dist_dir / "build-stats.json"
        with open(stats_file, 'w') as f:
            json.dump(self.stats, f, indent=2)

if __name__ == "__main__":
    builder = ProductionBuilder()
    builder.build_production()


