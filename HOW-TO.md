# Tarot – how to use it

## Adding your cards

1. Put each card's picture in the **cards** folder (JPG or PNG, upright, roughly 7 wide by 12 tall).
   Simple file names without spaces are safest, like `the-fool.jpg`.
2. Open **cards.js** in Notepad and add a block for each card:

   ```js
   {
     name: "The Fool",
     image: "cards/the-fool.jpg",
     text: `What the card means.

   A second paragraph.`,
   },
   ```

   Keep the comma after each `}`. A card with no picture yet shows its name on a plain face.

## Trying it on the PC

Double-click **index.html**. It opens in your browser and works the same way it will on the phone.

## Putting it online (free, with GitHub Pages)

1. Make a free account at github.com.
2. Create a new repository named `tarot` and set it to **Public**.
3. On the repository page choose **Add file → Upload files**, drag in everything from this folder
   (including the `cards` folder), and press **Commit changes**.
4. Go to **Settings → Pages**, set the source to **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
5. After a minute or two the app is at `https://YOUR-NAME.github.io/tarot/`.

To change cards later, upload the new or edited files the same way.
The site updates in a minute or two.

## Putting it on the iPhone

1. Open the address in **Safari**.
2. Tap **Share** (the square with the arrow), then **Add to Home Screen**.
3. It now has its own icon and opens full screen like an app. After the first visit it also works without internet.
