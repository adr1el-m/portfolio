#!/usr/bin/env python3
"""
Extract page sections from monolithic HTML file into separate template files
"""

import re
import os
from pathlib import Path

def extract_pages(html_file, output_dir):
    """Extract article sections into separate HTML files"""
    
    # Read the HTML file
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all article sections with data-page attribute
    # Pattern matches: <article ...data-page="name">...</article>
    pattern = r'<article[^>]*data-page="([^"]+)"[^>]*>(.*?)</article>'
    matches = re.findall(pattern, content, re.DOTALL)
    
    if not matches:
        print("No article sections found!")
        return
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Extract each page
    extracted = {}
    for page_name, article_content in matches:
        # Reconstruct the full article tag
        # Find the original opening tag
        article_pattern = rf'(<article[^>]*data-page="{page_name}"[^>]*>)'
        article_match = re.search(article_pattern, content)
        
        if article_match:
            opening_tag = article_match.group(1)
            full_article = f"{opening_tag}{article_content}</article>"
            
            # Only save once (avoid duplicates from repeated matches)
            if page_name not in extracted:
                output_file = os.path.join(output_dir, f"{page_name}.html")
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(full_article.strip())
                
                extracted[page_name] = len(full_article)
                print(f"✓ Extracted: {page_name}.html ({len(full_article)} bytes)")
    
    return extracted

def create_minimal_html(html_file, output_file, pages_to_keep=['about']):
    """Create a minimal HTML file with only the shell and initial page"""
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove all article sections except the ones we want to keep
    for page in ['background', 'projects', 'organizations', 'faq', 'achievements']:
        if page not in pages_to_keep:
            # Find and remove the entire article block
            pattern = rf'\s*<article[^>]*data-page="{page}"[^>]*>.*?</article>\s*'
            content = re.sub(pattern, '\n', content, flags=re.DOTALL)
    
    # Write the minimal HTML
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n✓ Created minimal HTML: {output_file}")
    print(f"  Original size: {os.path.getsize(html_file)} bytes")
    print(f"  New size: {os.path.getsize(output_file)} bytes")
    reduction = (1 - os.path.getsize(output_file) / os.path.getsize(html_file)) * 100
    print(f"  Reduction: {reduction:.1f}%")

if __name__ == '__main__':
    import sys
    
    # Paths
    html_file = 'index.html'
    output_dir = 'public/pages'
    backup_file = 'index.html.backup-monolithic'
    
    print("🔧 HTML Page Extraction Tool\n")
    print("=" * 50)
    
    # Check if HTML file exists
    if not os.path.exists(html_file):
        print(f"Error: {html_file} not found!")
        sys.exit(1)
    
    # Create backup
    if not os.path.exists(backup_file):
        import shutil
        shutil.copy2(html_file, backup_file)
        print(f"✓ Created backup: {backup_file}\n")
    
    # Extract pages
    print("Extracting page sections...")
    print("-" * 50)
    extracted = extract_pages(html_file, output_dir)
    
    if extracted:
        print("\n" + "=" * 50)
        print(f"✅ Successfully extracted {len(extracted)} pages!")
        print("\nPage sizes:")
        for page, size in sorted(extracted.items()):
            print(f"  - {page}.html: {size:,} bytes")
        
        # Calculate total
        total = sum(extracted.values())
        print(f"\n  Total extracted: {total:,} bytes")
        
        # Create minimal HTML
        print("\n" + "=" * 50)
        print("Creating minimal index.html...")
        print("-" * 50)
        
        # Keep only 'about' page initially
        create_minimal_html(html_file, 'index.html.new', pages_to_keep=['about'])
        
        print("\n" + "=" * 50)
        print("✅ DONE!")
        print("\nNext steps:")
        print("1. Review the extracted pages in:", output_dir)
        print("2. Review the new minimal HTML:", 'index.html.new')
        print("3. If everything looks good, replace:")
        print("   mv index.html.new index.html")
        print("\n⚠️  Backup saved at:", backup_file)
    else:
        print("\n❌ No pages were extracted!")
        sys.exit(1)
