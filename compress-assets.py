#!/usr/bin/env python3
"""
Asset Compression Script
Creates gzipped versions of assets for better compression
"""

import gzip
import os
from pathlib import Path

def compress_file(file_path, output_path=None):
    """Compress a file using gzip"""
    if output_path is None:
        output_path = str(file_path) + '.gz'
    
    with open(file_path, 'rb') as f_in:
        with gzip.open(output_path, 'wb') as f_out:
            f_out.writelines(f_in)
    
    original_size = os.path.getsize(file_path)
    compressed_size = os.path.getsize(output_path)
    compression_ratio = ((original_size - compressed_size) / original_size) * 100
    
    return original_size, compressed_size, compression_ratio

def compress_dist_assets():
    """Compress all assets in dist directory"""
    dist_dir = Path("dist")
    
    if not dist_dir.exists():
        print("❌ dist directory not found. Run build-production.py first.")
        return
    
    print("🗜️  Compressing production assets...")
    print("=" * 50)
    
    # Files to compress
    files_to_compress = [
        "index.html",
        "style.min.css", 
        "script.min.js"
    ]
    
    total_original = 0
    total_compressed = 0
    
    for file_name in files_to_compress:
        file_path = dist_dir / file_name
        if file_path.exists():
            original, compressed, ratio = compress_file(file_path)
            total_original += original
            total_compressed += compressed
            
            print(f"{file_name}:")
            print(f"  Original:    {original:,} bytes")
            print(f"  Compressed:  {compressed:,} bytes")
            print(f"  Saved:       {ratio:.1f}%")
            print()
    
    total_ratio = ((total_original - total_compressed) / total_original) * 100
    print(f"TOTAL COMPRESSION:")
    print(f"  Original:    {total_original:,} bytes")
    print(f"  Compressed:  {total_compressed:,} bytes") 
    print(f"  Saved:       {total_ratio:.1f}%")
    print("=" * 50)
    print("✅ Asset compression completed!")

if __name__ == "__main__":
    compress_dist_assets()


