#!/usr/bin/env python3
"""
Image Optimization Tool
Optimizes images for web deployment to reduce bundle size
"""

import os
import sys
from pathlib import Path
from PIL import Image
import subprocess

class ImageOptimizer:
    def __init__(self, source_dir, output_dir=None):
        self.source_dir = Path(source_dir)
        self.output_dir = Path(output_dir) if output_dir else self.source_dir
        self.stats = {
            'processed': 0,
            'skipped': 0,
            'errors': 0,
            'original_size': 0,
            'optimized_size': 0
        }
    
    def optimize_image(self, image_path, max_width=1920, quality=85):
        """Optimize a single image"""
        try:
            original_size = image_path.stat().st_size
            
            # Open image
            with Image.open(image_path) as img:
                # Convert RGBA to RGB if saving as JPEG
                if img.mode in ('RGBA', 'LA', 'P'):
                    if image_path.suffix.lower() in ['.jpg', '.jpeg']:
                        # Create white background
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        background.paste(img, mask=img.split()[-1] if len(img.split()) > 3 else None)
                        img = background
                    elif img.mode == 'P':
                        img = img.convert('RGBA')
                
                # Resize if needed
                if img.width > max_width or img.height > max_width:
                    ratio = max_width / max(img.width, img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                    print(f"  Resized: {img.size}")
                
                # Determine output path
                rel_path = image_path.relative_to(self.source_dir)
                output_path = self.output_dir / rel_path
                output_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Save optimized image
                save_kwargs = {'optimize': True}
                
                if image_path.suffix.lower() in ['.jpg', '.jpeg']:
                    save_kwargs['quality'] = quality
                    save_kwargs['progressive'] = True
                elif image_path.suffix.lower() == '.png':
                    save_kwargs['compress_level'] = 9
                
                img.save(output_path, **save_kwargs)
                
                optimized_size = output_path.stat().st_size
                reduction = ((original_size - optimized_size) / original_size) * 100
                
                self.stats['original_size'] += original_size
                self.stats['optimized_size'] += optimized_size
                self.stats['processed'] += 1
                
                return {
                    'success': True,
                    'original_size': original_size,
                    'optimized_size': optimized_size,
                    'reduction': reduction
                }
        
        except Exception as e:
            self.stats['errors'] += 1
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_directory(self):
        """Process all images in directory"""
        print(f"🔍 Scanning: {self.source_dir}")
        print("=" * 70)
        
        # Find all images
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
        image_files = [
            f for f in self.source_dir.rglob('*')
            if f.suffix.lower() in image_extensions and f.is_file()
        ]
        
        print(f"Found {len(image_files)} images to process\n")
        
        # Define optimization rules by directory
        rules = {
            'my-avatar.png': {'max_width': 512, 'quality': 90},  # Avatar
            'orgs': {'max_width': 800, 'quality': 85},  # Organization logos
            'honors': {'max_width': 1200, 'quality': 80},  # Achievement images
            'achievements': {'max_width': 1200, 'quality': 80},  # Achievement images
            'projects': {'max_width': 1200, 'quality': 80},  # Project images
            'pwa': {'max_width': 512, 'quality': 90},  # PWA icons
        }
        
        # Process each image
        for img_path in sorted(image_files):
            rel_path = img_path.relative_to(self.source_dir)
            print(f"📸 {rel_path}")
            
            # Determine optimization settings
            max_width = 1920
            quality = 85
            
            # Apply specific rules
            if img_path.name == 'my-avatar.png':
                max_width = rules['my-avatar.png']['max_width']
                quality = rules['my-avatar.png']['quality']
            else:
                for folder, settings in rules.items():
                    if folder in str(rel_path):
                        max_width = settings['max_width']
                        quality = settings['quality']
                        break
            
            # Get original size
            orig_size = img_path.stat().st_size
            print(f"  Original: {orig_size:,} bytes ({orig_size/1024:.1f} KB)")
            
            # Optimize
            result = self.optimize_image(img_path, max_width, quality)
            
            if result['success']:
                print(f"  Optimized: {result['optimized_size']:,} bytes ({result['optimized_size']/1024:.1f} KB)")
                print(f"  Reduction: {result['reduction']:.1f}%")
                print(f"  ✓ Success\n")
            else:
                print(f"  ✗ Error: {result['error']}\n")
        
        return self.stats
    
    def print_summary(self):
        """Print optimization summary"""
        print("\n" + "=" * 70)
        print("📊 OPTIMIZATION SUMMARY")
        print("=" * 70)
        
        print(f"\nProcessed: {self.stats['processed']} images")
        print(f"Skipped:   {self.stats['skipped']} images")
        print(f"Errors:    {self.stats['errors']} images")
        
        orig_mb = self.stats['original_size'] / (1024 * 1024)
        opt_mb = self.stats['optimized_size'] / (1024 * 1024)
        saved_mb = orig_mb - opt_mb
        reduction = ((self.stats['original_size'] - self.stats['optimized_size']) / 
                    self.stats['original_size'] * 100) if self.stats['original_size'] > 0 else 0
        
        print(f"\nOriginal size:  {orig_mb:.2f} MB")
        print(f"Optimized size: {opt_mb:.2f} MB")
        print(f"Space saved:    {saved_mb:.2f} MB ({reduction:.1f}% reduction)")
        
        print("\n" + "=" * 70)

def check_pillow():
    """Check if Pillow is installed"""
    try:
        import PIL
        return True
    except ImportError:
        return False

if __name__ == '__main__':
    print("🖼️  Image Optimization Tool")
    print("=" * 70)
    
    # Check for Pillow
    if not check_pillow():
        print("\n❌ Error: Pillow (PIL) is not installed!")
        print("\nInstall it with:")
        print("  pip install Pillow")
        print("\nOr:")
        print("  python3 -m pip install Pillow")
        sys.exit(1)
    
    # Get directories
    if len(sys.argv) > 1:
        source_dir = sys.argv[1]
    else:
        # Default to public/images
        source_dir = 'public/images'
    
    if not os.path.exists(source_dir):
        print(f"\n❌ Error: Directory not found: {source_dir}")
        sys.exit(1)
    
    # Create backup
    backup_dir = f"{source_dir}.backup-unoptimized"
    if not os.path.exists(backup_dir):
        print(f"\n📦 Creating backup: {backup_dir}")
        import shutil
        shutil.copytree(source_dir, backup_dir)
        print("✓ Backup created\n")
    
    # Optimize
    optimizer = ImageOptimizer(source_dir)
    stats = optimizer.process_directory()
    optimizer.print_summary()
    
    if stats['processed'] > 0:
        print("\n✅ Optimization complete!")
        print(f"\n⚠️  Backup saved at: {backup_dir}")
        print("\nNext steps:")
        print("1. Review optimized images")
        print("2. Run 'npm run build' to rebuild with optimized images")
        print("3. Check dist size: du -sh dist")
    else:
        print("\n⚠️  No images were processed!")
