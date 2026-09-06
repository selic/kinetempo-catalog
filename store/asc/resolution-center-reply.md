# Resolution Center reply — draft

Send as a **new message** in the existing thread (an already-sent message cannot
be edited, and a second message needs no cancellation of anything). Fill in the
three timestamps in square brackets from your recording before sending.

---

Thank you for the review. Please disregard the video in our previous message —
it was recorded on an older build and is superseded by the one attached here.

We have attached a new demonstration video to App Review Information and
replaced the binary: the submission now uses **build 6**, which also fixes a
crash we found while preparing this recording.

The video shows the app end to end on a physical iPhone. Two parts of it are
worth pointing out, because they are the parts that involve anything outside the
app itself.

**Creating an exercise with an assistant — [0:00].** Kinetempo draws a stick
figure for each exercise so the person can see the movement. Rather than ship a
fixed set of figures, the app lets the user describe the movement to a chat
assistant they already use. Tapping "New exercise → Claude" opens that
assistant's own app or website with a request already written; the app sends
nothing else and receives nothing directly. The assistant replies with a
`kinetempo://` link. Opening that link shows an import preview **inside**
Kinetempo, and nothing is added until the user confirms.

The link carries only the exercise's own data — its name, the duration of each
step, and the joint angles of the stick figure — compressed into the URL itself.
There is no server in the middle, nothing is downloaded, and no code is
executed: the app parses the data against a strict schema and rejects anything
that does not match. The same result can be pasted into the app as plain text
instead, for assistants that cannot produce a link.

**Sending an exercise to the catalog — [0:00].** The Library tab shows a small
curated collection of rehab programmes that ships with the app. The share sheet
has a "Send to the catalog" button, shown in the video. It submits the
programme's data as a proposal only: it opens a pull request against our public
catalog repository, and it is **not published to anyone** until a maintainer
reviews and merges it by hand. Accepted entries appear under a shared
"Community" publisher name, which the app states before the user submits.
Nothing a user creates is visible to other users at any point without that human
step. The maintainer is reachable at es@defency.net, which is also offered in
the app next to that button.

The rest of the app is offline and self-contained. There is no account, no
sign-in and no purchase of any kind; exercises, programmes and history are
stored locally on the device.

Please let us know if anything else would help.
