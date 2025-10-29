# Accessibility

This website is built with accessibility as a core requirement. The goal is to meet WCAG 2.1 Level AA guidelines and provide an inclusive experience for all users.

## Accessibility Statement

I am committed to making this website accessible and usable for everyone. Accessibility is an ongoing effort, and I continually improve through design, engineering, and testing.

- Standards: WCAG 2.1 AA
- Practices: Semantic HTML, keyboard support, visible focus, alt text, accessible names, color contrast, reduced motion support
- Testing: Automated checks via Axe and Pa11y in CI, plus manual audits and screen reader spot checks

If you encounter any accessibility barriers, please contact me at:

- Email: adrielmagalonadev@gmail.com

Last updated: October 29, 2025

## CI Checks (Axe & Pa11y)

Automated checks run on every push/PR through GitHub Actions.

- Workflow: `.github/workflows/accessibility.yml`
- Pa11y config: `pa11y-ci.json`

### Local Testing

1. Build the project:
   ```sh
   npm run build
   ```

2. Start the preview server:
   ```sh
   npm run preview
   ```

3. Run Pa11y on local preview:
   ```sh
   npx pa11y-ci --config ./pa11y-ci.json
   ```

4. Run Axe CLI on key pages:
   ```sh
   npx @axe-core/cli http://localhost:4173/
   npx @axe-core/cli http://localhost:4173/loading-demo.html
   npx @axe-core/cli http://localhost:4173/mobile-test-guide.html
   ```

Note: CI will fail if violations are detected. Review output, fix issues, and re-run.