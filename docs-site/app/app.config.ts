export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'zinc'
    },
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: 'Velvet Docs'
  },
  header: {
    title: 'Velvet',
    to: '/',
    logo: {
      alt: 'Velvet',
      light: '',
      dark: ''
    },
    search: true,
    colorMode: true,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/riceboxdev/Velvet',
      'target': '_blank',
      'aria-label': 'GitHub'
    }]
  },
  footer: {
    credits: `Velvet • © ${new Date().getFullYear()}`,
    colorMode: false,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/riceboxdev/Velvet',
      'target': '_blank',
      'aria-label': 'Velvet on GitHub'
    }]
  },
  toc: {
    title: 'Table of Contents',
    bottom: {
      title: 'Resources',
      edit: 'https://github.com/riceboxdev/Velvet/edit/main/docs-site/content',
      links: [{
        icon: 'i-lucide-star',
        label: 'Star on GitHub',
        to: 'https://github.com/riceboxdev/Velvet',
        target: '_blank'
      }]
    }
  }
})
