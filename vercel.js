{
    "version": 2,
    "builds": [
      { "src": "**/*.html", "use": "@vercel/static" },
      { "src": "**/*.css", "use": "@vercel/static" },
      { "src": "**/*.js", "use": "@vercel/static" }
    ],
    "routes": [
      { "src": "/(.*)", "dest": "/$1" }
    ]
  }
  