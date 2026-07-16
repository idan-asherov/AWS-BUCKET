# ========================================================
# שלב 1: שלב הבנייה והתקנת התלויות (Build Stage)
# ========================================================
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# העתקת מניפסט חבילות ה-NPM
COPY package*.json ./

# התקנת כל התלויות (כולל חבילות פיתוח אם יהיו בעתיד)
RUN npm ci

# העתקת שאר קובצי המקור לצורך הכנה
COPY . .

# ========================================================
# שלב 2: שלב הריצה הנקי והמאובטח (Production Stage)
# ========================================================
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

# העתקת תיקיית ה-node_modules המוכנה והרזה משלב ה-builder
COPY --from=builder /usr/src/app/node_modules ./node_modules

# העתקת קובצי השרת וה-Frontend הסטטיים בלבד
COPY app.js ./
COPY package.json ./
COPY public/ ./public/

# חשיפת פורט האפליקציה
EXPOSE 3000

# הרצה כפרופיל משתמש מאובטח שאינו Root (חלק מדרישות ה-Secured Host)
USER node

CMD ["npm", "start"]