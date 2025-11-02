import type { HomeStaticContent } from "./home.types";

export const homeStaticContent: HomeStaticContent = {
  hero: {
    eyebrow: "The Season of Velvet Rituals",
    heading: "Fragrances composed for evenings that linger.",
    subheading:
      "Layer sensorial accords that bloom after dusk. Each bottle is blended in micro batches and signed by the perfumer.",
    ctas: [
      {
        label: "Explore the Atelier",
        href: "/products",
        emphasis: true,
      },
      {
        label: "Join the Club",
        href: "/login",
      },
    ],
    image:
      "https://images.unsplash.com/photo-1573537805874-4cedc5d389ce?auto=format&fit=crop&w=1400&q=80",
  },
  genderSections: [
    {
      id: "men",
      title: "For Him",
      description: "Cedar, spice, and mineral notes curated for evening silhouettes.",
      ctaHref: "/products?gender=men",
      ctaLabel: "Shop men's perfumes",
      limit: 4,
    },
    {
      id: "women",
      title: "For Her",
      description: "Bouquets of ambered florals and gourmand ribbons for after-dark rituals.",
      ctaHref: "/products?gender=women",
      ctaLabel: "Shop women's perfumes",
      limit: 4,
    },
    {
      id: "unisex",
      title: "For Everyone",
      description: "Silhouettes that sway between soft woods and luminous citrus accords.",
      ctaHref: "/products?gender=unisex",
      ctaLabel: "Shop unisex perfumes",
      limit: 4,
    },
  ],
  highlights: [
    {
      id: "atelier",
      title: "Small-batch atelier craft",
      description:
        "All eau de parfums are poured in limited runs of 300 bottles, ensuring freshness and traceability.",
      icon: "Sparkles", 
    },
    {
      id: "ingredients",
      title: "Responsible ingredient sourcing",
      description:
        "We partner with growers who certify organic extraction and reinvest in biodiversity initiatives.",
      icon: "Leaf",
    },
    {
      id: "service",
      title: "Personal ritual concierge",
      description:
        "Members receive complimentary pairing consults to build seasonal scent wardrobes.",
      icon: "MessagesSquare",
    },
  ],
  rituals: [
    {
      id: "velour-ritual",
      title: "Velour evening ritual",
      focus: "A rose-amber aura for after-hours salons.",
      steps: [
        {
          title: "Prep the pulse points",
          description:
            "Mist wrists and collarbone with rose water to prime the skin and extend diffusion.",
        },
        {
          title: "Anchor with No. II oil",
          description:
            "Press two drops of dry body oil into the décolletage to warm Velour's vanilla base.",
        },
        {
          title: "Finish with Atelier veil",
          description:
            "Walk through a micro cloud of Noir Atelier to add smoked saffron trails.",
        },
      ],
      illustration:
        "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "noir-ritual",
      title: "Midnight layering",
      focus: "Contrast oud depths with luminous citrus.",
      steps: [
        {
          title: "Begin with atelier musk",
          description:
            "Apply a single spray to the nape to anchor oud with skin-hugging warmth.",
        },
        {
          title: "Mist citrus high points",
          description:
            "A light spray of Bergamot Draft along the shoulders brightens Noir Atelier's smoke.",
        },
        {
          title: "Seal with saffron cold throw",
          description:
            "Finish on the outer garments to leave a saffron ember trail without overpowering.",
        },
      ],
      illustration:
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  journal: [
    {
      id: "journal-micro-distillation",
      title: "Inside our micro-distillation studio",
      excerpt:
        "Tour the Marseille atelier where each velour accord is distilled and aged for at least 90 days.",
      href: "#",
      image:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "journal-layering",
      title: "Three layering stories for autumn soirées",
      excerpt:
        "Our scent director shares combinations that evolve from dusk cocktails to late-night galleries.",
      href: "#",
      image:
        "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "journal-sourcing",
      title: "Sourcing petals with regenerative farmers",
      excerpt:
        "Meet the collectives powering our rose and jasmine harvests across Grasse and Jaipur.",
      href: "#",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  membership: {
    headline: "Join The Smelly Water Club",
    subheadline:
      "Preview limited releases, receive quarterly scent kits, and access live ritual salons.",
    perks: [
      {
        id: "monthly-drops",
        title: "Members-only monthly drops",
        description:
          "Reserve experimental accords and archival reissues before public release.",
      },
      {
        id: "complimentary-refills",
        title: "Complimentary mini refills",
        description:
          "Earn 10 ml travel refills with every second full-size purchase.",
      },
      {
        id: "concierge",
        title: "Concierge curation",
        description:
          "Chat with our ritual team for pairing suggestions tailored to your calendar.",
      },
    ],
  },
};
