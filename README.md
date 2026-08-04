# Claude Images - AWS Deployment

פרויקט להרצה וניהול של אפליקציית Node.js בקונטיינר בענן של AWS, תוך שימוש בשירותי ענן מתקדמים, אוטומציה וניהול אחסון מול S3.

---

## 🏗️ איך המערכת בנויה?

המערכת בנויה בארכיטקטורת Microservices / Serverless-adjacent מבוססת ענן:

1. **Compute (ECS / Fargate):** האפליקציה רצה בקונטיינרים של Docker ומנוהלת תחת Amazon ECS באמצעות Fargate (ללא צורך בניהול שרתי EC2 פיזיים).
2. **Networking & Load Balancing:** תעבורת המשתמשים מגיעה קודם כל ל-**Application Load Balancer (ALB)** אשר מפנה את הבקשות בצורה מאוזנת (Load Balancing) אל משימות ה-ECS דרך פורט 3000, תוך ביצוע בדיקות בריאות (Health Checks) שוטפות.
3. **Storage (Amazon S3):** האפליקציה מתקשרת עם באקט ייעודי ב-S3 לשמירה ולניהול קבצי המדיה/התמונות.

---

## ☁️ באילו שירותי AWS השתמשנו?

- **Amazon ECS (Elastic Container Service) & Fargate:** להרצת הקונטיינרים בסביבת Serverless.
- **Amazon ECR (Elastic Container Registry):** לאחסון תמונות ה-Docker (Docker Images).
- **Application Load Balancer (ALB):** לניתוב תעבורת רשת ציבורית (HTTP) אל הקונטיינרים.
- **Amazon S3:** באקט אחסון ענני לשמירת התמונות/נתונים של האפליקציה.
- **AWS IAM (Identity and Access Management):** לניהול הרשאות מאובטח בין קונטיינרי ה-ECS לשירותי ה-S3 וה-CloudWatch.
- **Amazon CloudWatch:** לאיסוף לוגים וניטור פעילות השרת.

---

## 🔄 איך ה-CI/CD עובד?

הפריסה והעדכון של האפליקציה מנוהלים בצורה אוטומטית או ידנית מבוססת קונטיינרים:

1. **Build:** בניית תמונת ה-Docker (Docker Image) המכילה את קוד האפליקציה והתלויות.
2. **Push:** העלאת ה-Image המעודכן אל ה-Repository ב-**Amazon ECR**.
3. **Deploy:** עדכון ה-Task Definition ב-ECS והפעלת **Force New Deployment**. ה-ECS מבצע Rolling Update חלקתי שבו המשימות הישנות מתנתקות בצורה מסודרת (Connection Draining) והחדשות עולות במקומן ללא הפסקת שירות (Zero Downtime).

---

## 🔐 איך טיפלתם בהרשאות?

ניהול ההרשאות בוצע בצורה קפדנית ומאובטחת באמצעות **AWS IAM Roles**:

- **Task Execution Role:** מאפשר לסוכן ה-ECS למשוך את תמונת הקונטיינר מ-ECR ולשלוח לוגים ל-CloudWatch.
- **Task Role:** תפקיד ייעודי שניתן לקוד הרץ בתוך הקונטיינר, המעניק לו הרשאות גישה מבוקרות (IAM Policy) לבאקט ה-S3 לצורך קריאה וכתיבה של קבצים, מבלי לצורך לשמור קדדנטציות (Access Keys) רגישות בתוך הקוד.

---

## 🛠️ בעיה שנתקלנו בה ואיך פתרנו אותה?

- **הבעיה:** בשלבי העלייה הראשונים של הקונטיינר ל-ECS, הופיעה אזהרה בלוגים שציינה כי משתני הסביבה הנדרשים לזיהוי באקט ה-S3 (`S3_BUCKET` / `S3_BUCKET_NAME`) אינם מוגדרים, וה-Health Checks של ה-ALB נכשלו עם שגיאות `404` או `Timeout`. בנוסף, גילינו שחוקי ה-Security Group של ה-ALB לא אפשרו תעבורת HTTP ציבורית (פורט 80) מבחוץ.
- **הפתרון:**
  1. הגדרנו מחדש את משתני הסביבה הנדרשים ישירות בתוך ה-**Task Definition** של ה-ECS (הוספת המפתחות התואמים עבור חיבור ה-S3 והרשת).
  2. עדכנו את ה-**Security Group** של ה-Load Balancer כך שיאפשר תעבורת כניסה בפורט `80` (HTTP) מכל כתובת (`0.0.0.0/0`).
  3. ביצענו Force Deployment מעודכן שווידא שהמשימות רצות בצורה תקינה, עוברות בהצלחה את בדיקות הבריאות, ומקושרות בצורה חלקה ל-Load Balancer.

---

## 📐 תרשים ארכיטקטורה בסיסי

```text
[ User / Browser ]
        │
        ▼ (HTTP / Port 80)
[ Application Load Balancer (ALB) ]
        │
        ▼ (Port 3000)
[ AWS ECS / Fargate (Tasks) ] ──(IAM Roles)──> [ Amazon S3 (Storage) ]
        │
        └──> [ Amazon CloudWatch (Logs) ]
```
