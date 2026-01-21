```markdown
# CorpQueryX 🛡️

**CorpQueryX** is a secure, AI-driven document query system designed for corporate environments. It integrates semantic vector search with strict Role-Based Access Control (RBAC) to ensure users can only access information matching their security clearance.

## 🌟 Key Features

* **Semantic Search:** Uses **Qdrant** vector database to find documents based on meaning, not just keywords.
* **RBAC Filtering:** Enforces security levels (e.g., `min_role_level`) directly within the search query to prevent unauthorized access.
* **Secure Auth:** JWT-based authentication middleware (Level 10+ access controls).
* **Development Ready:** Configured with `nodemon` and `dotenv` for rapid iteration.

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Vector Database:** Qdrant (Dockerized)
* **Authentication:** JSON Web Tokens (JWT)
* **Environment:** Linux (Ubuntu/Debian)

## 🚀 Getting Started

### 1. Prerequisites
* Node.js (v18+)
* Docker (for Qdrant)
* Git

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone [https://github.com/ImplementX/CorpQueryX.git](https://github.com/ImplementX/CorpQueryX.git)
cd CorpQueryX/backend
npm install

```

### 3. Configuration

Create a `.env` file in the `backend` directory:

```env
PORT=5000
QDRANT_URL=http://localhost:6333
JWT_SECRET=your_secure_secret_key
DEFAULT_ROLE_LEVEL=1

```

### 4. Running the Database

Start Qdrant using Docker:

```bash
docker run -p 6333:6333 qdrant/qdrant

```

### 5. Running the Application

**Development Mode (Auto-restart):**

```bash
npm run dev

```

**Production Start:**

```bash
npm start

```

## 🧠 Database Schema & Payloads

To ensure the RBAC filter works, all documents upserted to Qdrant **must** include the `min_role_level` integer in the payload:

```json
{
  "id": "uuid-string",
  "vector": [0.012, -0.05, ...],
  "payload": {
    "content": "Confidential Project Data...",
    "category": "finance",
    "min_role_level": 10
  }
}

```

## 👤 Author

**Shubham Jain**

* *M.Tech Computer Science & Engineering*
* *MNNIT Allahabad*
* *Enrollment:* 2025CS17

## 📄 License

This project is licensed under the MIT License.

```

```