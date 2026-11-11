# Tarot – how to use it

## Adding your cards

1. Put each card's picture in the **cards** folder (JPG or PNG, upright, roughly 7 wide by 12 tall).
   Simple file names without spaces are safest, like `the-fool.jpg`.
   All 78 cards already have the original 1909 Rider-Waite-Smith pictures by Pamela Colman Smith
   (public domain, from Wikimedia Commons). To use a different picture, replace the file with one
   of the same name.
2. Open **cards.js** in Notepad. All 78 cards are already there; fill in each one:

   ```js
   {
     name: "The Fool",
     image: "cards/the-fool.jpg",
     short: `A line or two, shown when the card is turned over.`,
     details: `The longer page, shown under "More about this card".

   A second paragraph.`,
   },
   ```

   Keep the comma after each `}`. To add more cards (like the Minor Arcana), copy a whole block.
   A card with no picture yet shows its name on a plain face.

## Tags (the golden boxes)

Open **tags.js**. Each tag has an id (one lowercase word), the name on the box and its meaning.
To give a card a tag, put the id in that card's `tags` line in cards.js, e.g. `tags: ["dawnbringer"],`
— several tags go in the same brackets, separated by commas.

On a computer, hovering over a tag shows its meaning and clicking it lists every card with that tag.
On the phone, tapping shows the meaning with a button to list the cards.

## The switches on the home screen

Under the spreads there are three switches. All start off, and each phone or computer remembers its own choice.

- **Tags** shows the golden tag boxes.
- **Court cards** adds the Pages and Knights to the deck. In cards.js they're marked `court: true`.
- **Reversed cards** lets a card come out upside down, about half the time. The card window then says "Reversed".

## Spreads and their questions

Open **spreads.js**. Each spread has one line per card position, with a `label` (shown under the card)
and a `question` (shown in the card's window). Fill in the questions when you have them.

## The card back

The back is the picture `card-back.svg`. To use your own art, put it in the cards folder and change
the `--card-back` line near the top of **style.css**, e.g. `url("cards/back.jpg")`.

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
