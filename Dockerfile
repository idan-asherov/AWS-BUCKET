# ========================================================
# שלב 1: שלב הבנייה והתקנת התלויות (Build Stage)
# ========================================================
FROM node:22-alpine AS builder

WORKDIR /app

# העתקת מניפסט החבילות
COPY package*.json ./

# התקנת תלויות ייצור בלבד (שומר על אימג' קטן ומאובטח)
RUN npm ci --only=production

# העתקת קוד המקור והפרונטאנד במפורש
COPY src/ ./src/
COPY public/ ./public/
COPY app.js ./

# ========================================================
# שלב 2: שלב הריצה הנקי והמאובטח (Production Stage)
# ========================================================
FROM node:22-alpine AS runner

WORKDIR /app

# העתקת תיקיית node_modules הנקייה משלב ה-builder
COPY --from=builder /app/node_modules ./node_modules

# העתקת קובצי השרת ומשאבי הפרונטאנד בצורה מפורשת (מונע Cache ישן)
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/app.js ./app.js
COPY package.json ./

# חשיפת הפורט עליו רץ השרת
EXPOSE 3000

# הרצה כמשתמש מאובטח שאינו Root
USER node

CMD ["npm", "start"]