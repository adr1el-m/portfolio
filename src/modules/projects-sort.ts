/**
 * Sort project cards in the Projects article so that:
 * 1) Cards with video thumbnails come first,
 * 2) Then cards with image thumbnails,
 * 3) Then cards without either (fallback).
 */
export class ProjectsSorter {
  sort(): void {
    const projectsArticle = document.querySelector('article.projects');
    if (!projectsArticle) return;

    const list = projectsArticle.querySelector('ul.project-list');
    if (!list) return;

    const items = Array.from(list.querySelectorAll('li.project-item')) as HTMLLIElement[];
    if (items.length === 0) return;

    const hasVideoThumb = (li: HTMLLIElement) => !!li.querySelector('figure.project-img video.project-card-video');
    const hasImageThumb = (li: HTMLLIElement) => !!li.querySelector('figure.project-img img');

    const videos: HTMLLIElement[] = [];
    const images: HTMLLIElement[] = [];
    const none: HTMLLIElement[] = [];

    // Preserve original relative order within each group
    for (const li of items) {
      if (hasVideoThumb(li)) {
        videos.push(li);
      } else if (hasImageThumb(li)) {
        images.push(li);
      } else {
        none.push(li);
      }
    }

    const reordered = [...videos, ...images, ...none];

    // Only mutate DOM if order actually changes
    const changed = reordered.some((li, idx) => li !== items[idx]);
    if (!changed) return;

    const frag = document.createDocumentFragment();
    for (const li of reordered) frag.appendChild(li);
    list.appendChild(frag);
  }
}