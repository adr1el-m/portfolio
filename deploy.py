#!/usr/bin/env python3
"""
Deployment Script for Portfolio
Complete build and deployment preparation
"""

import subprocess
import shutil
from pathlib import Path

def run_command(command, description):
    """Run a command and print status"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"   Output: {e.output}")
        return False

def deploy_portfolio():
    """Complete deployment process"""
    print("🚀 Starting portfolio deployment process...")
    print("=" * 60)
    
    steps = [
        ("python3 optimize-images.py", "Optimizing images"),
        ("python3 build-production.py", "Building production assets"),
        ("python3 compress-assets.py", "Compressing assets with gzip"),
    ]
    
    for command, description in steps:
        if not run_command(command, description):
            print("\n❌ Deployment failed!")
            return False
    
    # Generate deployment summary
    print("\n" + "=" * 60)
    print("📊 DEPLOYMENT SUMMARY")
    print("=" * 60)
    
    # Check file sizes
    dist_dir = Path("dist")
    if dist_dir.exists():
        print("\n📁 Production files:")
        production_files = [
            "index.html",
            "style.min.css",
            "script.min.js"
        ]
        
        for file_name in production_files:
            file_path = dist_dir / file_name
            gz_path = dist_dir / (file_name + ".gz")
            
            if file_path.exists():
                size = file_path.stat().st_size
                gz_size = gz_path.stat().st_size if gz_path.exists() else 0
                
                print(f"  {file_name}:")
                print(f"    Minified: {size:,} bytes ({size/1024:.1f}KB)")
                if gz_size > 0:
                    compression = ((size - gz_size) / size) * 100
                    print(f"    Gzipped:  {gz_size:,} bytes ({gz_size/1024:.1f}KB, {compression:.1f}% smaller)")
    
    print("\n🎯 Deployment commands:")
    print("  Development: npm run dev")
    print("  Production:  npm run serve:prod")
    print("  Full build:  npm run build:full")
    
    print("\n📦 Ready for deployment to:")
    print("  • Static hosting (Vercel, Netlify, GitHub Pages)")
    print("  • CDN (CloudFlare, AWS CloudFront)")
    print("  • Any web server (Apache, Nginx)")
    
    print("\n✅ Portfolio deployment preparation complete!")
    print(f"📁 Deploy the 'dist' directory to your hosting provider")

if __name__ == "__main__":
    deploy_portfolio()


