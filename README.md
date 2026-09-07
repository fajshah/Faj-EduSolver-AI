# EduSolve AI 🎓

EduSolve AI is a modern multi-subject AI homework helper with multimodal support (photo upload & text) and bilingual explanations tailored for students.

## Features

- 📸 **Photo & Multimodal Problem Solving**: Upload clear photos of homework questions, handwritten notes, or equations.
- 📚 **Multi-Subject Expertise**: Specialized guidance for Mathematics, Science, History, English, Computer Science, Urdu, Islamiat, and Pakistan Studies.
- 🌍 **Bilingual & Urdu Nastaliq Support**: Native Urdu script explanations for Urdu & Islamiat subjects.
- 💡 **Step-by-Step Methodology**: Detailed explanations + concise final answers + 3 personalized practice questions.
- ⏱️ **Recent Solves History**: Saved locally in the browser for quick review.

---

## 🚀 How to Push to GitHub

1. Initialize git and commit your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: EduSolve AI"
   ```

2. Create a new repository on [GitHub](https://github.com/new).

3. Link your local repository and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```

---

## ⚡ How to Deploy on Vercel

1. Go to [Vercel](https://vercel.com) and log in.
2. Click **"Add New..."** > **"Project"**.
3. Import your GitHub repository.
4. **Configure Project**:
   - **Framework Preset**: Vite (detected automatically)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - Name: `GEMINI_API_KEY`
   - Value: Your Google AI Studio API key (get one from [Google AI Studio](https://aistudio.google.com/apikey))
6. Click **Deploy**! 🚀

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Create .env file with your Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Run development server
npm run dev
```
