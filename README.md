# smolishyt

smolishyt is an automated uploader that takes YouTube videos and uploads them to smolish.com.

## Configure your .env file

Use this template to configure your environmental variables:

```bash
# Extract your Smolish cookie from network requests for authentication
COOKIE=
# Include a channel ID if you want to upload videos from a specific YouTube channel
CHANNEL_ID=
```

## Upload Shorts from YouTube

1. Make sure you have your ```COOKIE``` configured
2. Run ```npm run dev```

## Upload Shorts from a specific YouTube channel

1. Make sure you have your ```COOKIE``` and target ```CHANNEL_ID``` configured
2. Run ```npm run channel:dev```

## Disclaimer

This script is for educational purposes. Do not attempt to bypass Smolish's rate limits with this.

## License

smolishyt is licensed under Apache 2.0. Check [LICENSE](./LICENSE) for more details.

© 2026 Ethan Lee