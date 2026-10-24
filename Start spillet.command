#!/bin/bash
# Dobbeltklik på denne fil for at starte spillet
cd "$(dirname "$0")"
(sleep 1 && open "http://localhost:8123") &
echo "Luk dette vindue for at stoppe spillet."
python3 serve.py 8123
