# Contributing to Portfolio

First off, thank you for considering contributing to this portfolio project! 🎉

## Code of Conduct

This project and everyone participating in it is expected to uphold professional and respectful standards. Please be kind, inclusive, and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs 🐛

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (screenshots, code snippets, etc.)
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (OS, browser, Node version)

### Suggesting Enhancements ✨

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any similar features** in other projects if applicable

### Pull Requests 🚀

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code style guidelines
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Ensure all checks pass** (linting, type-checking, tests)
6. **Submit your pull request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/portfolio.git
cd portfolio

# Install dependencies
npm ci

# Create a new branch
git checkout -b feature/your-feature-name

# Start development server
npm run dev
```

## Code Style Guidelines

### TypeScript
- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### CSS
- Follow BEM naming convention when applicable
- Use CSS custom properties for theming
- Ensure responsive design for all screen sizes
- Maintain WCAG AA color contrast ratios

### Commits
- Use conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep commits focused and atomic
- Write clear commit messages

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Code passes ESLint checks (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Performance budgets are met (`npm run perf:budget`)
- [ ] Accessibility standards maintained (manual testing)
- [ ] Works on mobile devices
- [ ] No console errors or warnings
- [ ] Documentation updated if needed

## Performance Considerations

- Keep bundle sizes small (use code splitting)
- Optimize images (AVIF/WebP formats)
- Lazy load non-critical resources
- Maintain Lighthouse scores above 90

## Accessibility Requirements

- Use semantic HTML
- Provide proper ARIA labels
- Ensure keyboard navigation works
- Maintain color contrast ratios (WCAG AA)
- Test with screen readers

## Questions?

Feel free to open an issue for any questions or discussions!

---

Thank you for contributing! 🙏
