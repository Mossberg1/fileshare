#!/bin/sh

cleanup() {
  cd ..
  exit 0
}

# build frontend
cd frontend
npm run build
cd ..

# run backend
cd backend
npm run dev

cleanup