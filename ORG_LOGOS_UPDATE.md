# Organization Logos Path Update

## Date: October 15, 2025

### ✅ Organization Logo Paths Updated

**Change Summary:**
All organization logos have been moved from `/public/optimized/images/` to `/public/images/orgs/` and all HTML references have been updated accordingly.

### Files Moved:
The following organization logos are now in `/public/images/orgs/`:
- `AWS.jpg` - AWS Cloud Club PUP
- `GDSC.png` - Google Developer Student Clubs PUP
- `JBECP.jpg` - Junior Blockchain Education Consortium of the Philippines
- `MMSC.jpg` - PUP Manila Microsoft Student Community
- `TPG.jpg` - PUP The Programmers' Guild

### Updated Paths in `index.html`:

| Organization | Old Path | New Path |
|--------------|----------|----------|
| GDSC | `public/optimized/images/GDSC-optimized.png` | `/images/orgs/GDSC.png` |
| AWS | `public/optimized/images/AWS-optimized.jpg` | `/images/orgs/AWS.jpg` |
| MMSC | `public/optimized/images/MMSC-optimized.jpg` | `/images/orgs/MMSC.jpg` |
| TPG | `public/optimized/images/TPG-optimized.jpg` | `/images/orgs/TPG.jpg` |
| JBECP | `public/optimized/images/JBECP-optimized.jpg` | `/images/orgs/JBECP.jpg` |

### Benefits:
- ✅ **Better Organization**: Logos are now in a dedicated `orgs` folder
- ✅ **Cleaner Structure**: Separates organizational assets from other images
- ✅ **Easier Maintenance**: Simpler to locate and update organization-specific images
- ✅ **Consistent Naming**: Removed `-optimized` suffix for cleaner file names
- ✅ **Shorter Paths**: More concise URLs in the HTML

### Verification:
- All 5 organization logo paths updated successfully
- Build completed without errors
- HTML validates correctly

### Lines Updated in `index.html`:
- Line 965: GDSC logo
- Line 985: AWS logo
- Line 1005: MMSC logo
- Line 1025: TPG logo
- Line 1045: JBECP logo

---

## Next Steps:
You may want to optimize these images for web (WebP format, proper sizing) if they haven't been optimized yet. Consider adding:
- WebP versions for better compression
- Responsive image sizes (small, medium, large)
- Lazy loading (already implemented ✅)
