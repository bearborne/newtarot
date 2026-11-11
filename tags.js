// ───────────────────────────────────────────────────────────────
//  YOUR TAGS
//  Each tag has:
//    an id     – lowercase, no spaces, used in cards.js to give a
//                card this tag (e.g. tags: ["dawnbringer"])
//    name      – what the golden box says
//    meaning   – shown when you hover over or tap the box.
//                Leave an empty line between paragraphs.
//
//  Copy a whole block to add a new tag.
// ───────────────────────────────────────────────────────────────

const TAGS = {
  dawnbringer: {
    name: "Dawnbringer",
    meaning: `Brought to you will be the night’s end, and the sun will rise.

This card reminds you the dawn’s about to break and the suffering will soon end.

The prize at the end is worth the trials and tribulations.`,
  },
  naivety: {
    name: "Naivety",
    meaning: `Lack of experience, wisdom, or judgment might be the case with your current issue.

Hopeful eagerness and diving headfirst into situation might sound thrilling, but you must think your choices through this time.

Look for some appropriate guidance for this matter or another point of view and you soon will realize you've dodged a bullet.`,
  },
  focus: {
    name: "Focus",
    meaning: `You must pick a center for your attention in order to advance at this stage of your life.

Now is the time to put all of your energy and willpower into one important matter and go along with the plan.`,
  },
  confidence: {
    name: "Confidence",
    meaning: `Now might be the time to believe that you can rely on yourself or someone else.

You are capable of greatness you are not completely aware of.

Your trust is not in vain.`,
  },
  celebration: {
    name: "Celebration",
    meaning: `No matter how you think your life is, you have more than enough and this is a time to count the blessings.

Now is the time to practice gratefulness.

Look back and see how far you've come and properly enjoy the rewards you've earned.`,
  },
  duskbringer: {
    name: "Duskbringer",
    meaning: `The light dwindles, possibly along with the joy and the pain.

This card heralds the time of preparation for the night that comes. This might be a long-awaited battle or the end of it from which you’re seeking respite.

Dig your heels, stand your ground and if you endure the acid rain, there will be much wisdom gained.`,
  },
  "the-first-flame": {
    name: "The First Flame",
    meaning: `If you’re inspired by anything to any degree this is the sign to follow it.

This card suggests you to take the risk on the road to creativity and do what feels terrifying.

Trust that whichever outcome presents itself, there is no loss, only lessons learned.`,
  },
  "wisdom-within": {
    name: "Wisdom Within",
    meaning: `The answers you’ve been looking for under every stone is here already.

Take a deep breath, turn on your favorite song or sit in the woods.

You only need to stop and listen.`,
  },
  companionship: {
    name: "Companionship",
    meaning: `This is about a love profound. It’s unique, welcoming and it envelops you like a warm blanket.

It’s time to give in to the good old love and open your heart to someone new or someone very close to you.

If it feels terrifying to do so, that might be just the sign to really do it.`,
  },
  voyage: {
    name: "Voyage",
    meaning: `There’s distance to be crossed, be it without or within.

A change of scenery, a shift of thought or a new point of view…

You’ll benefit from anything new and out of ordinary, but it’s very likely that this travel of sorts is temporary.`,
  },
  perseverance: {
    name: "Perseverance",
    meaning: `You need to hold on tight and stand your ground as the waves wash over you for now.

You’ll find the strength you need in and around you. Stay resolute, persist and find ways to tolerate the hardship.

Don’t forget the day will come.`,
  },
  introspection: {
    name: "Introspection",
    meaning: `You need some time alone whether if you actually want it or not.

Do stuff that allows you to spend time with yourself, there’s a deeper need to be alone and replenish your reserves.

Maybe begin with asking a question to yourself and write down the inner dialogue as it’s happening.`,
  },
  "hand-of-fate": {
    name: "Hand of Fate",
    meaning: `Forces out of your control are attempting to nudge you to the right direction.

This card tells you to set sails and let the winds guide you instead of tunnel visioning one of the options.

Fate’s water might taste bitter at first, but it will be healing nonetheless. Believe that the universe wishes you well and you’ll soon realize it was a bullet dodged.`,
  },
  balance: {
    name: "Balance",
    meaning: `There is night as there is day, and the dark is followed only by the light.

This card reminds you to balance pleasure and discipline; be it work and play or taking care of your body’s needs.

Find your balance in the universe of things and you will have a much easier time moving through the space.`,
  },
  "death-decay": {
    name: "Death & Decay",
    meaning: `As the leaves fall, they decompose and get absorbed by the soil. Their cells nourish the new seeds to become.

All things must end, but don’t let this rule of nature lead you to despair, the worst must end too.

The dead shall decay and dissolve to make room for something new to grow, the same’s for your inner world.`,
  },
  interruption: {
    name: "Interruption",
    meaning: `A siren of pause might delay or wholly stop your advances in a certain aspect of your life.

As frustrating as it might be, this might be a time for reevaluation, to think everything through one last time before the last fork on the road.

Letting go sucks, but sometimes it’s freeing.`,
  },
  "grand-justice": {
    name: "Grand Justice",
    meaning: `Look back at what you’ve done recently. Be it an act of altruism or a deed done with a self-centered motivation.

Whatever comes to your mind, you must evaluate it carefully, for this card tells you that it will return tenfold.

There still might be time to correct a mistake. Otherwise, delight in the reward for the good you’ve done.`,
  },
  temptress: {
    name: "Temptress",
    meaning: `Lust and hunger dance around you like ravenous wolves, yet you’re the only one who can hold the leash.

Pay great mind to the whispers in your head. Carefully measure the distance you’re willing to walk for pleasure.

It’s fun walking into the dark and unknown. But the pair of red glowing eyes may turn out to be your reflection.`,
  },
  chaos: {
    name: "Chaos",
    meaning: `Disorder seeps into your core and trembles you from deep within, so that you find what remains while others fall.

This disaster is a cleansing rain, with thunder and lightning but purifying nonetheless.

Like the other forces of the grand universe chaos, too, is a gift; only wrapped in something seemingly much more sinister.`,
  },
  "lunar-light": {
    name: "Lunar Light",
    meaning: `At the end of a long and tiring day awaits the calm of the night, with the moon’s silvery rays on your shoulders.

This is a place of maternal love. This card is asking you to lay down your sword and take a rest in this safe harbor.

Open your bruised and bleeding heart to the light and let it be healed.`,
  },
  starlight: {
    name: "Starlight",
    meaning: `This is the right time to dream of a life that’s beyond the borders of realism.

Close your eyes and build yourself the world you wish to live in - just like wishing on a star.

Thought can easily become a reality during this period, so you need to think well and create.`,
  },
  heartrend: {
    name: "Heartrend",
    meaning: `Disappointment, loss and sorrow; three fiends dancing around a fire, screaming and howling.

You just might have received a fatal blow or you might be expecting to, but it won’t be the final one.

The times are hard and you’re asked to walk over the fire but you’ll see: This, too, is a gift.`,
  },
  mindgames: {
    name: "Mindgames",
    meaning: `Thoughts run wild; a hundred foxes around your head. What’s correct and what’s wrong?

Fighting against your mind won’t do you any good, as it won’t listen to reason. Meditate or find a way to center yourself.

Remember to temper the quickness of your mind with discipline.`,
  },
  strife: {
    name: "Strife",
    meaning: `Not all disputes can be resolved through diplomacy and peace, neither should they be.

Don’t be afraid to raise your voice against the injustice and wrongdoing.

You must love yourself enough to do the uncomfortable and stand for yourself.`,
  },
  interference: {
    name: "Interference",
    meaning: `There’s a looming presence over your life, influencing your thoughts and actions; and even the results you’re getting or expecting from certain events.

Question the advice you’re getting from the outside sources, as well as the inside ones.

If you’re sure you’re not self-sabotaging, then check if a person has something to gain by manipulating you.`,
  },
  deception: {
    name: "Deception",
    meaning: `A thing or person might appear to you much different from what or who they actually are.

This card warns you to be cautious and suspicious of this possibly deceiving presence and go over the details many times more.

Be careful who or what you trust, especially if they seem “too good to be true”.`,
  },
  inhibition: {
    name: "Inhibition",
    meaning: `There are unseen chains holding you back from doing what you desire.

Look back at your recent choices and you might find out how you ended up here. You can always start over with something new, but free yourself from the current state you’re in first.

These chains, while extremely real, are usually self-inflicted.`,
  },
  recognition: {
    name: "Recognition",
    meaning: `If you’ve been working on a project now is the time to display it.

Be it art or work, now is the time to take credit and bask in the applause. You’ll never know who’ll open the right door for you.

The world’s hungry for your creation. Try and make use of this period.`,
  },
  instinct: {
    name: "Instinct",
    meaning: `Your intuition is trying to tell you that something’s up.

When your body warns you about something it will make it extremely hard to ignore. That’s mostly because you must listen to it.

Be it a rolling thunder, be it the butterflies act accordingly and it will be a smooth ride.`,
  },
  brilliance: {
    name: "Brilliance",
    meaning: `You’re about to reach a breakthrough of some sorts.

Expansion of mind is imminent; open yourself to the alternative ways of thinking

This is a great time for mental adventures.`,
  },
  "into-the-unknown": {
    name: "Into the Unknown",
    meaning: `You might be taking on a new quest in life. Although you’re headed into unfamiliar territories, you are to find what you’re out for.

Be it riches or monsters, this place will offer itself to your curiosity.

It might be frightening at first but in time you will build your footholds and conquer this new land.`,
  },
  overburdened: {
    name: "Overburdened",
    meaning: `How many battles are you fighting at the same time?

This might be a warning that you’re dividing your focus and energy so much that soon you’ll be burn-out.

Choose a few tasks to take on at a time, do some careful planning and let go of what you can handle later.`,
  },
  armistice: {
    name: "Armistice",
    meaning: `This might be a time to put down your weapons for a while.

You might have to work with a hostile party or need them. A more important situation or event might force you to see beyond the disagreement.

This peace might be short-lived but it is needed nevertheless.`,
  },
  concord: {
    name: "Concord",
    meaning: `A mutually beneficial transaction is to occur between you and the other party, be it a formerly hostile or neutral relationship, it will soon take a much positive turn.

You might come together with others for a common goal, or this might be a start for a work friendship.

Being open and more understanding of the other person will be utmost rewarding.`,
  },
  affliction: {
    name: "Affliction",
    meaning: `When everything feels like a well-thought-out plan to make you miserable it’s easy to fall into despair.

The time might be dark and maybe it feels like you’re dying but the worst night still ends and dawn always breaks.

With a little more effort to hold on, you’ll leave this battle with loot unimaginable.`,
  },
  avoidance: {
    name: "Avoidance",
    meaning: `Running away is the easiest option available to you at all times. But not today.

What you’re facing won’t be so easily escapable. You will be forced to stay and deal with this situation head on.

Wait and withstand for a while and you will learn or earn something for sure.`,
  },
  hunger: {
    name: "Hunger",
    meaning: `Often when the life’s eventful and somewhat dull, we actively look for events that will bring us any kind of stimulation.

This can easily lead to issues caused by mindlessly throwing yourself into possibly unpleasant situations.

Try to see without the red-tinted glasses and be careful not to obsess over something very deceptive in reality.`,
  },
  stagnation: {
    name: "Stagnation",
    meaning: `You might be feeling stuck, not able to get where you want or as fast as you prefer, leaving you restless and frustrated.

The speed at which life sets you might not be under your control, but it’s up to you to change your sails depending on the winds.

Try to focus on your immediate surroundings and reconsider if you can take an alternate path to reach the destination.`,
  },
  infestinger: {
    name: "Infestinger",
    meaning: `It’d be wise to remember that rarely events or people appear as they really are.

We can’t define ourselves independently but only in relation to others. This easily leads to a “brighter grass” perspective.

Instead of finding fulfillment in what we readily possess, we desire one other’s current state in life, which is never so desirable as it seems.`,
  },
  terror: {
    name: "Terror",
    meaning: `Your body might be shaking with a dread that clouds your mind and drains your blood.

Did you do something unordinary? Did you eat, sleep and take care of you body and mind? Or maybe you’re facing an actual horror in life.

Even though it feels intolerable now, once the dust settles and the emotions subside (as they always do) you will clearly see the opportunity to change the situation.`,
  },
  harbinger: {
    name: "Harbinger",
    meaning: `You’re about to, or already did, receive extraordinarily life changing news.

Might bring joy or it might wreak havoc, either way this is a gift.

Know that this is a huge opportunity to take action, and it’s completely up to you to decide.`,
  },
  pestilence: {
    name: "Pestilence",
    meaning: `Of body or mind, an ailment of sorts is afflicting you.

This is a warning from the universe to take better care of your body and mind, to discipline both and look carefully at the unhealthy behaviors.

It might be wise to seek professional help, too.`,
  },
  materialism: {
    name: "Materialism",
    meaning: `Be wary of the tendency to consider material possessions and physical comfort way too much.

While there is no fault in enjoying the riches of the world and indulging yourself with luxury, set yourself a higher purpose.

Remember that comfort is the death of progress and betterment.`,
  },
  detachment: {
    name: "Detachment",
    meaning: `Unresolved and buried experiences may hold the space to feel anything else, leading to numbness and dullness.

While it’s easier to ignore and gaslight yourself into thinking your problems are not important enough, clearly, you’re not fooling anyone.

Deal with what’s impending to be dealt, feel what’s waiting to be felt and be free of its influence.`,
  },
  desertion: {
    name: "Desertion",
    meaning: `Loneliness, when not managed carefully, can haunt us like a deadly illness.

You might be feeling alone in the world, with no one to care for and take care of you. It falls wholly to us to put ourselves out there and find our tribe, however hard it feels.

It’d be wise to remember: If you don’t love yourself, no one probably will.`,
  },
  fulfillment: {
    name: "Fulfillment",
    meaning: `The road of truly sating one’s hunger is through fulfillment.

Meaningful connections with people, intimate relationships and creativity are some of the most fulfilling paths you can walk on.

Do something like this today, and it will be extra rewarding.`,
  },
};
