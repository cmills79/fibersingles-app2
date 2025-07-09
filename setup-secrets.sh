#!/bin/bash

# FiberFriends Vertex AI Setup Script
# This script sets up your Supabase Edge Function secrets for Vertex AI integration

echo "🚀 Setting up FiberFriends Vertex AI integration..."
echo "================================================"

# Set your Google Cloud Project ID
echo "Setting VERTEX_AI_PROJECT_ID..."
supabase secrets set VERTEX_AI_PROJECT_ID=fibersingles-app2

# Set the Vertex AI location (us-central1 is recommended for Imagen)
echo "Setting VERTEX_AI_LOCATION..."
supabase secrets set VERTEX_AI_LOCATION=us-central1

# Set your Google Service Account Key
# IMPORTANT: This must be on a single line!
echo "Setting GOOGLE_SERVICE_ACCOUNT_KEY..."
supabase secrets set GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"fibersingles-app2","private_key_id":"1d8493a6ecb16ee394e66f0ad2975e0dd306dc90","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCWZov/jyTQVyzx\nMY3Fj8KvuBf/4MXTy0nx2K4e7cVS3liSvmBot2/6YOqH3nJPixaYaZJ6mPE0DpVP\nGxhzPTEQ4BtdrME/ureod4GXF8dlMxV6feI3md3bE7vMOZaYt5VUwVc1jYyw9xfm\nwKARYP0sBZXLe+4i83YpSCslM9BDxDkgqZI8NKnIVFB0XBwora9q3cb9x25mMj0H\nKLECjwvW2HBcwF6W0SrQeIL2xiaTuu1noTtPHSE4KOG2LSUohYxkb+MwUgNpaVRm\nlh48QzBMNvLijlV2Tb5lHot8X99/i0vtnvRa2zUN/ZthTwsmXGgJs7dwBAJK6EU8\nagi2OuALAgMBAAECggEABV2c2TJl4wK9irlRxK/1TSU1CCqUz9hbdlsWthhP3oPN\nHg/YIk/laoubJsQgPSps4MKVoVKeQFUaUDKg0MUi6/2oohjS4lVB/QgCzXebzN2n\na1SukU6EzRc/mAfmS8vzFRkXn602HpBQuhIjNT5s2GHZiW8CK0vFjVLv5O8+vd8J\nEbdZaEmIqbi7cQw8B5h9U4434UodCc6H35B/fymfMUPzZYYzOWEIchsHNkRCT7Qw\nhYWq7nR9GwhCCN1elNfemXPfu/XAF8oqvj2+rauavzAgXcYlEWSNd/aYRLFuzT7o\nqLr7gXlQhPzn5WT5v7sAbWFaOxqH5viMsqUyGDVUuQKBgQDNxDlFmg24PEG1/AKU\nBVkv9BxS3vJnBf5HXu0w0Ro0gqhFJ4JiQdxknzUKr9Id7stwT9wlsmYHqtrYFIEX\nts3b0kZ+wg3UpCaO0bJgzpUppidrTs169FcA+Gu57vjkwxrH4jVIaNPFkHDiCMkT\nOk1yWFfH5PQORewrmMWEs1VoHwKBgQC7Hh9P7ZaCqhwNMOhPQEnQ7iQMIMON0dJ8\n5eUbCmy/64ny2QPktT2D7NwBfzMyUxnOoCUl4g6DBj4fzhI9CiEkDwTr2XmE2dtD\nq6uHs9evub48jADNvObPKlcKKuISo+zg0CNDUlI6g2+Aqo5dGBnkPe4PKoHiCbF0\nHgFsI0n6lQKBgBdibX/Teiut7WnZMhHQacphW7avT60VqUhDKYGawfelwanaS58P\nDRUCYuzL/n0YXlZtPP+rvpywdh6IdgNT6yFITGqrcxbvcNJaUoNd9uW81E4FrqSC\nkECz+soutmqJIcoFkzifcTHKsIl/phphTdvo3lEBXBsjJyvtOMVT/CjRAoGBAIao\nP8pqZYU03CkWCCh4UGbd6e0cav6VgA/H9d9G2konPEgaqrWdRF67RvyAyJwvt4O+\nNd2UV/Msu+pxhyiMMJtdf6InCE915F