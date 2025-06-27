# HelloWords - Minimalist Journal

A privacy-first, minimalist journaling app designed to encourage unstructured writing and deep reflection. Built with a focus on simplicity and user experience, inspired by the clean aesthetic of blank.page.

## 🌟 Philosophy

HelloWords believes that the best journaling happens when there are no barriers between thought and expression. By removing structure, formatting options, and complex features, we create a space where your thoughts can flow freely without distraction.

## ✨ Features

### Current
- **Minimalist Interface**: Clean, distraction-free writing environment
- **Zero Structure**: No templates, categories, or forced organization
- **Privacy-First**: End-to-end encryption with client-side encryption keys
- **Location Privacy**: Optional location saving with user control
- **Dark/Light Mode**: Seamless theme switching
- **OAuth Authentication**: Secure Google sign-in
- **Responsive Design**: Works beautifully on all devices
- **Settings Management**: User preferences and account management

### Privacy & Security
- **Client-Side Encryption**: All entries encrypted before reaching our servers
- **AES-GCM Encryption**: Military-grade encryption using user-specific keys
- **No Data Access**: Even if our database is compromised, your entries remain private
- **Location Control**: Location saving is opt-in and disabled by default
- **Anonymous Writing**: Write entries before signing in (saved after authentication)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account for backend

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hellowords
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_NEW_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_NEW_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   Run the SQL scripts in `scripts/setup-database.sql` to create the necessary tables.

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Encryption**: Web Crypto API, AES-GCM
- **AI/ML**: OpenAI embeddings for semantic search
- **Deployment**: Vercel

### Key Components
- **Encryption Service**: Client-side encryption/decryption
- **Embeddings**: Semantic search and similarity detection
- **Auth Flow**: OAuth with pending entry handling
- **Settings Management**: User preferences and account controls

## 🔮 Roadmap

### Phase 1: Enhanced Intelligence (Q2 2024)
- [ ] **RAG Integration**: Semantic search across journal entries
- [ ] **Smart Insights**: AI-powered writing prompts and reflections
- [ ] **Entry Summarization**: Automatic key point extraction
- [ ] **Mood Tracking**: Sentiment analysis and emotional patterns

### Phase 2: Knowledge Graph (Q3 2024)
- [ ] **Neo4j Integration**: Graph database for relationship mapping
- [ ] **Entity Recognition**: Automatic extraction of people, places, events
- [ ] **Relationship Visualization**: Interactive graphs showing connections
- [ ] **Timeline Analysis**: Temporal relationship mapping

### Phase 3: Advanced Analytics (Q4 2024)
- [ ] **Writing Patterns**: Analysis of writing habits and styles
- [ ] **Topic Evolution**: Track how themes develop over time
- [ ] **Character Networks**: Visualize relationships between people mentioned
- [ ] **Event Correlation**: Connect events across different time periods

### Phase 4: Collaborative Features (Q5 2024)
- [ ] **Shared Journals**: Collaborative writing spaces
- [ ] **Family History**: Multi-generational journal preservation
- [ ] **Export Options**: Rich export formats for backup and sharing

## 🎨 Design Principles

### Minimalism
- **Less is More**: Every element serves a purpose
- **Focus on Content**: UI elements fade when writing
- **Clean Typography**: Optimized for readability and flow

### User Experience
- **Zero Learning Curve**: Intuitive interface that feels natural
- **Progressive Disclosure**: Advanced features available but not intrusive
- **Responsive Feedback**: Subtle animations and state changes

### Privacy by Design
- **Default Privacy**: All privacy features enabled by default
- **User Control**: Granular control over data sharing
- **Transparency**: Clear explanations of data handling

## 🔧 Development

### Project Structure
```
hellowords/
├── app/                 # Next.js app directory
├── components/          # Reusable UI components
│   ├── ui/             # Radix UI components
│   └── SettingsPage.tsx
├── lib/                # Core utilities
│   ├── encryption.ts   # Encryption service
│   ├── embeddings.ts   # AI embeddings
│   └── supabase.ts     # Database client
├── scripts/            # Database setup scripts
└── text-editor.tsx     # Main journal component
```

### Key Features Implementation
- **Client-Side Encryption**: All data encrypted before transmission
- **Pending Entry Handling**: Entries written before auth are preserved
- **Location Privacy**: Optional GPS with user consent
- **Settings Management**: Comprehensive user preferences

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the minimalist design of [blank.page](https://blank.page)
- Built with [Next.js](https://nextjs.org) and [Supabase](https://supabase.com)
- UI components from [Radix UI](https://www.radix-ui.com)
- Styling with [Tailwind CSS](https://tailwindcss.com)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/sebastiancmanalo/hellowords/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sebastiancmanalo/hellowords/discussions)
- **Email**: support@hellowords.app

---

**HelloWords** - Where thoughts flow freely, and privacy is paramount. 