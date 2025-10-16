# 📊 Performance Monitoring - Quick Reference

## 🚀 Quick Start

### View Performance (Development)
```bash
npm run dev
```
Then open http://localhost:8002 and check:
- Console for performance badge
- Bottom-right for live dashboard

### Run Lighthouse Audit
```bash
npm run build
npm run preview
npm run lighthouse  # In another terminal
```

### Check Performance Budget
```bash
npm run perf:budget
```

### Run CI Audit
```bash
npm run lighthouse:ci
```

---

## 📊 What Gets Tracked

### ✅ Core Web Vitals
- **LCP** - Largest Contentful Paint (< 2.5s)
- **INP** - Interaction to Next Paint (< 200ms)
- **CLS** - Cumulative Layout Shift (< 0.1)
- **FCP** - First Contentful Paint (< 1.8s)
- **TTFB** - Time to First Byte (< 800ms)

### ✅ Lighthouse Scores (90+ Required)
- Performance
- Accessibility
- Best Practices
- SEO

### ✅ Resource Budgets
- JS: 300KB max
- CSS: 50KB max
- Images: 500KB max
- Fonts: 100KB max

---

## 🎯 Performance Grades

| Score | Grade | Color |
|-------|-------|-------|
| 90-100 | A | 🟢 Green |
| 80-89 | B | 🟢 Light Green |
| 70-79 | C | 🟡 Yellow |
| 60-69 | D | 🟠 Orange |
| 0-59 | F | 🔴 Red |

---

## 📍 Where to Find Data

### Development
- Browser Console
- Performance Dashboard (bottom-right)
- Terminal logs

### Production
- **Vercel Dashboard:** https://vercel.com/[project]/analytics
- **GitHub Actions:** Repository → Actions tab
- **Google Search Console:** After ~7 days

---

## 🛠️ NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run lighthouse` | Single Lighthouse audit |
| `npm run lighthouse:ci` | CI audit (3 runs) |
| `npm run perf:audit` | Full audit with build |
| `npm run perf:budget` | Budget validation |

---

## 📝 Key Files

| File | Purpose |
|------|---------|
| `src/modules/performance-monitor.ts` | Core tracking |
| `src/modules/performance-dashboard.ts` | Visual UI |
| `lighthouserc.json` | Lighthouse config |
| `performance-budget.json` | Budgets |
| `.github/workflows/performance.yml` | CI/CD |

---

## 💡 Pro Tips

1. **Run audits regularly** to catch regressions early
2. **Check budget** before committing large changes
3. **Monitor Vercel dashboard** for real user data
4. **Use dashboard** to debug performance issues
5. **Review Lighthouse suggestions** to improve scores

---

## 🎓 Interview Talking Points

✅ "Real-time Core Web Vitals monitoring"  
✅ "Lighthouse CI in GitHub Actions"  
✅ "95+ performance score"  
✅ "Strict performance budgets"  
✅ "Production analytics via Vercel"  
✅ "Sub-2.5s LCP consistently"

---

## 📚 Documentation

- Full Guide: `PERFORMANCE_MONITORING.md`
- Implementation: `PERFORMANCE_IMPLEMENTATION.md`
- Fix Summary: `FIXED_PERFORMANCE_MONITORING.md`

---

**Quick Access:** Press F12 → Console → Look for 🚀 badge
