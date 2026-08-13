# Сборка витрины для VPS.
#
# Образ ничего не обслуживает: он только собирает статику и отдаёт её в общий
# том, откуда её раздаёт nginx из medix-core/docker-compose.prod.yml. Держать
# здесь второй nginx смысла нет — заголовки, TLS и проксирование /api всё
# равно настраиваются в одном месте, иначе они разъедутся.
#
# Переменные VITE_* нужны на этапе сборки: Vite подставляет их в бандл, а не
# читает в рантайме. Поэтому они приходят как build args, а не env.

FROM node:22-alpine AS build

WORKDIR /app

# Сначала манифесты — слой с зависимостями переиспользуется, пока они не менялись.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Адрес API. На VPS витрина и API живут на одном домене, поэтому путь
# относительный: /api/v1 проксирует nginx. Значение по умолчанию оставлено
# для локальной сборки образа без аргументов.
ARG VITE_PUBLIC_API_BASE_URL=/api/v1
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_VAPID_KEY=""
ARG VITE_SENTRY_DSN=""

ENV VITE_PUBLIC_API_BASE_URL=$VITE_PUBLIC_API_BASE_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

# Финальный слой без Node: только собранные файлы и команда, которая кладёт их
# в том. Копируем через cp -a содержимого, а не каталога, чтобы при повторном
# выкате файлы заменялись на месте, а не вкладывались друг в друга.
FROM alpine:3.20

COPY --from=build /app/dist /dist

# Старые файлы удаляются: имена ассетов содержат хэш, и без очистки том
# бесконечно копил бы бандлы прошлых выкатов.
CMD ["sh", "-c", "rm -rf /out/* && cp -a /dist/. /out/ && echo 'web dist published'"]
