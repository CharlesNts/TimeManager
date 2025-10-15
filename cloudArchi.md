# 🚀 TimeManager – Cloud Architecture Plan

## Overview
The **TimeManager** platform combines a **Spring Boot backend**, a **React frontend**, and a **PostgreSQL database** to manage teams, users, and working hours efficiently.  
This document describes the future evolution of the project into a **cloud-integrated analytics architecture** using **AWS S3** and **Databricks (or Apache Spark)** for reporting and advanced data analysis.

---

## 🏗️ System Components

| Layer | Technology | Hosting / Service | Role |
|-------|-------------|-------------------|------|
| **Frontend** | React.js | Vercel | User interface (dashboard, reports, etc.) |
| **Backend** | Spring Boot (Java 21) | Railway | API + business logic |
| **Database (OLTP)** | PostgreSQL | Railway | Operational database for all app data |
| **Data Lake** | Amazon S3 | AWS | Stores exported data snapshots for analytics |
| **Analytics Engine** | Databricks / Apache Spark | AWS | Runs large-scale transformations & reporting |

---

## 🧠 Data Flow

1. **Application Layer**
   - Users interact with the **React frontend**, which calls the **Spring Boot API** hosted on Railway.
   - All operational data (users, teams, clocks, etc.) is stored in **PostgreSQL**.

2. **Data Export**
   - On-demand or scheduled jobs in the backend export relevant data from Postgres to **AWS S3** (in CSV or Parquet format).
   - Example exports: clock-ins, users, teams, or daily aggregates.

3. **Analytics Layer**
   - **Databricks** (or **Spark**) reads data from S3.
   - Performs transformations, computes KPIs (e.g., average work hours, lateness rates, productivity metrics).
   - Writes **aggregated results** back to:
     - S3 (as report files), and/or  
     - Railway Postgres (in dedicated reporting tables).

4. **Frontend Integration**
   - The frontend continues calling existing Spring endpoints.
   - Reports can be fetched directly from **Postgres** or via signed **S3 URLs** for larger datasets.

---

## ⚙️ Data Architecture

| Type | Storage | Purpose |
|------|----------|----------|
| **OLTP Data** | PostgreSQL (Railway) | Fast transactions, system of record |
| **Analytical Data** | S3 (AWS) | Historical snapshots, scalable queries |
| **Derived KPIs** | Postgres (reporting schema) | Fast access for dashboards |
| **Logs / Raw Exports** | S3 | Backup and long-term history |

---

## 🔄 Batch Flow Example

| Step | Description | Tool |
|------|--------------|------|
| 1️⃣ | Extract user & clock data from Postgres | Spring Boot job |
| 2️⃣ | Upload to S3 | AWS SDK in backend |
| 3️⃣ | Run Databricks/Spark job | Databricks Jobs API |
| 4️⃣ | Aggregate by user/team, compute KPIs | Spark |
| 5️⃣ | Store results back in Postgres or S3 | JDBC / S3 write |
| 6️⃣ | Frontend fetches & displays report | REST API |

---

## 🛡️ Security & Credentials

- **IAM User (AWS)**  
  - Minimal privileges (read/write on a single S3 bucket).  
  - Access keys stored securely in **Railway variables**.
- **PostgreSQL Access**  
  - Use a dedicated `analytics_user` for Databricks with limited permissions.
- **HTTPS enforced** across all API endpoints.

---

## 💸 Cost & Scalability

| Component | Estimated Monthly Cost | Notes |
|------------|------------------------|-------|
| Railway (Backend + Postgres) | Free (512 MB plan) | Keep data compact |
| Vercel (Frontend) | Free (Hobby plan) | |
| AWS S3 | ~$0.05 | For small CSV/Parquet files |
| Databricks (small cluster) | ~$5–$20 | Only for short jobs, auto-terminate |
| **Total (learning setup)** | **$5 – $20 / month** | Real-world cloud experience at low cost |

---

## 🧩 Future Improvements

- Automate S3 exports with **Spring Scheduler** or **Airflow**.
- Integrate **Delta Lake** for incremental updates.
- Introduce **Kafka** for real-time event streaming (future phase).
- Deploy backend to **AWS ECS / Elastic Beanstalk** once scaling is needed.
- Use **AWS Glue Catalog** for metadata management.

---

## ✅ Key Takeaways

- Keep **Postgres on Railway** as the main transactional database.  
- Use **S3** as a small data lake for analytics exports.  
- Plug **Databricks / Spark** to compute reports and write aggregated metrics back.  
- This architecture stays free (or very cheap), scalable, and enterprise-grade for demonstration or real use.

---


