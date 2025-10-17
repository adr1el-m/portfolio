#!/bin/bash
#
# Image Optimization Script for macOS
# Uses built-in 'sips' command to optimize images
#

set -e

SOURCE_DIR="${1:-public/images}"
BACKUP_DIR="${SOURCE_DIR}.backup-unoptimized"

echo "🖼️  Image Optimization Tool (macOS)"
echo "======================================================================"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Directory not found: $SOURCE_DIR"
    exit 1
fi

# Create backup if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo ""
    echo "📦 Creating backup: $BACKUP_DIR"
    cp -R "$SOURCE_DIR" "$BACKUP_DIR"
    echo "✓ Backup created"
fi

echo ""
echo "🔍 Scanning: $SOURCE_DIR"
echo "======================================================================"

# Statistics
PROCESSED=0
ORIGINAL_SIZE=0
OPTIMIZED_SIZE=0

# Function to get file size in bytes
get_size() {
    stat -f%z "$1" 2>/dev/null || echo 0
}

# Function to optimize image
optimize_image() {
    local file="$1"
    local max_width="$2"
    local quality="$3"
    
    local filename=$(basename "$file")
    local rel_path="${file#$SOURCE_DIR/}"
    
    echo ""
    echo "📸 $rel_path"
    
    # Get original size
    local orig_size=$(get_size "$file")
    local orig_kb=$((orig_size / 1024))
    echo "  Original: $orig_size bytes ($orig_kb KB)"
    
    # Get current dimensions
    local dims=$(sips -g pixelWidth -g pixelHeight "$file" 2>/dev/null | grep -E "pixelWidth|pixelHeight" | awk '{print $2}' | paste -sd 'x' -)
    echo "  Dimensions: $dims"
    
    # Resize if needed
    local width=$(echo "$dims" | cut -d'x' -f1)
    local height=$(echo "$dims" | cut -d'x' -f2)
    
    if [ "$width" -gt "$max_width" ] || [ "$height" -gt "$max_width" ]; then
        echo "  Resizing to max: ${max_width}px"
        sips -Z "$max_width" "$file" > /dev/null 2>&1
    fi
    
    # Optimize based on format
    if [[ "$file" == *.png ]]; then
        # PNG: Reduce to 256 colors if appropriate, optimize
        echo "  Optimizing PNG..."
        # Note: sips doesn't have quality control for PNG, but we can ensure it's optimized
        sips -s format png "$file" --out "$file" > /dev/null 2>&1
    elif [[ "$file" == *.jpg ]] || [[ "$file" == *.jpeg ]]; then
        # JPEG: Set quality
        echo "  Optimizing JPEG (quality: $quality%)..."
        sips -s format jpeg -s formatOptions "$quality" "$file" --out "$file" > /dev/null 2>&1
    fi
    
    # Get new size
    local new_size=$(get_size "$file")
    local new_kb=$((new_size / 1024))
    local reduction=0
    
    if [ $orig_size -gt 0 ]; then
        reduction=$(( (orig_size - new_size) * 100 / orig_size ))
    fi
    
    echo "  Optimized: $new_size bytes ($new_kb KB)"
    echo "  Reduction: $reduction%"
    echo "  ✓ Success"
    
    ORIGINAL_SIZE=$((ORIGINAL_SIZE + orig_size))
    OPTIMIZED_SIZE=$((OPTIMIZED_SIZE + new_size))
    PROCESSED=$((PROCESSED + 1))
}

echo ""
echo "Processing images..."
echo "----------------------------------------------------------------------"

# Process my-avatar.png (avatar)
if [ -f "$SOURCE_DIR/my-avatar.png" ]; then
    optimize_image "$SOURCE_DIR/my-avatar.png" 512 90
fi

# Process organization logos
if [ -d "$SOURCE_DIR/orgs" ]; then
    echo ""
    echo "📁 Organization Logos..."
    find "$SOURCE_DIR/orgs" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) | while read file; do
        optimize_image "$file" 800 85
    done
fi

# Process honors/achievements images
if [ -d "$SOURCE_DIR/honors" ]; then
    echo ""
    echo "📁 Honors/Achievements..."
    find "$SOURCE_DIR/honors" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) | while read file; do
        optimize_image "$file" 1200 80
    done
fi

# Process project images
if [ -d "$SOURCE_DIR/projects" ]; then
    echo ""
    echo "📁 Projects..."
    find "$SOURCE_DIR/projects" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) | while read file; do
        optimize_image "$file" 1200 80
    done
fi

# Process PWA icons
if [ -d "$SOURCE_DIR/pwa" ]; then
    echo ""
    echo "📁 PWA Icons..."
    find "$SOURCE_DIR/pwa" -type f -name "*.png" | while read file; do
        # Don't resize PWA icons, just optimize
        filename=$(basename "$file")
        if [[ "$filename" == icon-* ]]; then
            echo ""
            echo "📸 pwa/$filename"
            orig_size=$(get_size "$file")
            echo "  Original: $orig_size bytes ($((orig_size / 1024)) KB)"
            sips -s format png "$file" --out "$file" > /dev/null 2>&1
            new_size=$(get_size "$file")
            echo "  Optimized: $new_size bytes ($((new_size / 1024)) KB)"
            reduction=0
            if [ $orig_size -gt 0 ]; then
                reduction=$(( (orig_size - new_size) * 100 / orig_size ))
            fi
            echo "  Reduction: $reduction%"
            ORIGINAL_SIZE=$((ORIGINAL_SIZE + orig_size))
            OPTIMIZED_SIZE=$((OPTIMIZED_SIZE + new_size))
            PROCESSED=$((PROCESSED + 1))
        fi
    done
fi

# Print summary
echo ""
echo "======================================================================"
echo "📊 OPTIMIZATION SUMMARY"
echo "======================================================================"
echo ""
echo "Processed: $PROCESSED images"
echo ""

ORIG_MB=$(echo "scale=2; $ORIGINAL_SIZE / 1024 / 1024" | bc)
OPT_MB=$(echo "scale=2; $OPTIMIZED_SIZE / 1024 / 1024" | bc)
SAVED_MB=$(echo "scale=2; $ORIG_MB - $OPT_MB" | bc)
REDUCTION=0

if [ $ORIGINAL_SIZE -gt 0 ]; then
    REDUCTION=$(echo "scale=1; ($ORIGINAL_SIZE - $OPTIMIZED_SIZE) * 100 / $ORIGINAL_SIZE" | bc)
fi

echo "Original size:  $ORIG_MB MB"
echo "Optimized size: $OPT_MB MB"
echo "Space saved:    $SAVED_MB MB ($REDUCTION% reduction)"
echo ""
echo "======================================================================"
echo ""
echo "✅ Optimization complete!"
echo ""
echo "⚠️  Backup saved at: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Review optimized images in: $SOURCE_DIR"
echo "2. Run 'npm run build' to rebuild with optimized images"
echo "3. Check dist size: du -sh dist"
echo ""
