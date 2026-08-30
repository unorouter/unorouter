import { PostSections } from "@/components/pages/blog/post-sections";

export function OpenSourceOpenrouterAlternativeContent() {
  return (
    <PostSections
      slug="open-source-openrouter-alternative"
      chunks={{
        gh: (chunks) => (
          <a
            href="https://github.com/unorouter"
            target="_blank"
            rel="noopener noreferrer"
          >
            {chunks}
          </a>
        ),
      }}
    />
  );
}
