# Shizuka CRM

A complete, full-stack University CRM application built with React, Vite, Flask, and Microsoft SQL Server.

## Project Structure

- **`/frontend`**: React + Vite application featuring a modern, responsive UI.
- **`/backend`**: Python Flask REST API connected to SQL Server using SQLAlchemy.

---

## 🚀 How to Run the Application

You will need to open **two separate terminal windows** to run the frontend and backend simultaneously.

### 1. Start the Backend Server
Open your first terminal and run the following commands:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python run.py
```
*The backend API will start running at `http://127.0.0.1:5000`.*

### 2. Start the Frontend Development Server
Open your second terminal and run the following commands:

```powershell
cd frontend
npm run dev
```
*The frontend will start running. Usually accessible at `http://localhost:8080` (or whichever port Vite gives you). Open that URL in your browser to view the app!*

---

## 🛠️ Database Setup (If setting up on a new machine)
1. Open SQL Server Management Studio (SSMS).
2. Create an empty database named `university_crm`.
3. Ensure the `.env` file in the `/backend` folder has the correct `DATABASE_URL` for your SQL Server instance.
4. Run the database migrations to create the tables:
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   flask db upgrade
   ```
