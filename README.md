# StudyCraft AI 📚✨

> 🌐 **Live Application**: [https://studycraft-ai-five.vercel.app](https://studycraft-ai-five.vercel.app)

StudyCraft AI is an AI-powered study workspace designed to help students genuinely understand their textbooks. 

Instead of acting like a generic chatbot that invents answers, StudyCraft AI reads your actual uploaded textbook PDFs, answers your questions with exact page citations, retrieves the original diagrams from the book, and generates interactive flashcards and quizzes.

---

## 🌟 What Makes StudyCraft AI Different?

- **Zero Hallucinations**: Every answer is strictly grounded in your textbook. If the book doesn't cover a topic, StudyCraft tells you honestly instead of making things up.
- **Exact Page Citations**: Every explanation links back to the specific printed page number and excerpt from the book.
- **Original Textbook Diagrams**: When a question involves a diagram (like Newton's second law, free-body diagrams, or pulley systems), StudyCraft shows the real figure directly from the textbook with an interactive zoom viewer.
- **Interactive Revision**: Turn textbook topics into 3D flip flashcards and multiple-choice quizzes with instant explanations.
- **Clean Educational Interface**: A modern, distraction-free study layout inspired by top educational platforms.

---

## 🚀 Key Features

### 1. 📖 Ask the Book
Type any question in plain English. StudyCraft searches through your book, gathers relevant excerpts, and gives you a structured explanation with mathematical formulas and real page citations.

### 2. 🖼️ Original Diagram Viewer
Textbooks teach through diagrams. When an answer refers to a figure, the actual high-resolution diagram from the textbook is displayed side-by-side. You can click to zoom and inspect details clearly.

### 3. 🗂️ Diagram-Augmented Flashcards
Review key concepts with interactive flashcards. If a flashcard relates to a textbook figure, the diagram is embedded right into the card.

### 4. 📝 Self-Assessment Quizzes
Generate quick 4-option quizzes on any topic. Each question gives immediate feedback with a clear explanation of why the correct option is right.

### 5. 📚 Book Shelf
Upload and manage multiple textbooks. StudyCraft keeps your books organized so you can switch between subjects anytime.

---

## 🛠️ How It Works (Simple 3-Step Flow)

1. **Upload & Clean**: When you upload a textbook PDF, StudyCraft removes repeated headers, footers, and page numbers, and extracts embedded diagrams and figures.
2. **Hybrid Search**: When you ask a question, StudyCraft searches your textbook using both **semantic similarity** (understanding what you mean) and **keyword matching** (finding exact technical terms).
3. **Grounded Answer Generation**: Gemini reads the matched excerpts and writes a clear explanation citing the exact pages. If relevant diagrams exist, they are displayed right alongside the answer.

---

## 💻 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router) & [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom educational design tokens
- **Database & Vectors**: [Supabase](https://supabase.com/) (PostgreSQL + `pgvector` for vector similarity and storage)
- **AI Models**: [Google Gemini 2.5 Flash](https://ai.google.dev/) for answer synthesis and `text-embedding-004` for vector embeddings
- **PDF Engine**: PyMuPDF for high-resolution diagram extraction and text parsing
- **Icons & Effects**: [Lucide React](https://lucide.dev/) and Canvas Confetti

---

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Supabase](https://supabase.com/) project (with pgvector enabled)
- A [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/shwetang01/StudyCraft_AI.git
cd StudyCraft_AI
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

Add your keys inside `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```text
StudyCraft_AI/
├── src/
│   ├── app/
│   │   ├── api/books/            # REST endpoints for upload, ask, figures & flashcards
│   │   ├── globals.css           # Modern theme styling & layout tokens
│   │   └── page.tsx              # Main study workspace
│   ├── components/
│   │   ├── AppSidebar.tsx        # Navigation sidebar
│   │   ├── AppTopNav.tsx         # Book switcher and status bar
│   │   ├── BookLibraryView.tsx   # Bookshelf & PDF dropzone
│   │   ├── BookQAPanel.tsx       # 2-column study panel & diagram zoom
│   │   └── FlashcardDeck.tsx     # 3D interactive flashcards
│   └── lib/
│       ├── rag/                  # Ingestion, hybrid search, vision & QA
│       ├── supabase/             # Database and storage clients
│       └── types.ts              # TypeScript domain types
├── supabase/
│   └── migrations/               # PostgreSQL schema & pgvector setup
├── scripts/
│   ├── e2e_comprehensive_test.ts # Automated end-to-end test suite
│   └── pdf_processor.py          # PDF text and figure extractor
├── README.md
└── package.json
```

---

## 🧪 Testing

To run the comprehensive end-to-end verification test suite:
```bash
npx tsx scripts/e2e_comprehensive_test.ts
```

This verifies:
- PDF upload and SHA-256 deduplication
- Database connection and pgvector schema integrity
- Hybrid search and page-level citation accuracy
- Original diagram retrieval and status
- Flashcard and quiz generation
- Data persistence across sessions

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
