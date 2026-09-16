# Email Summarizer (CT-75)

A local CLI the Operator runs to read Unread Messages from their Gmail and print a Digest. This glossary is for that product, not the SDLC tooling in this repo.

## Language

**Operator**:
The person who runs the CLI on their machine and whose Gmail the CLI reads.
_Avoid_: user, account, customer

**CLI**:
The local command-line program the Operator runs. It is not a hosted service.
_Avoid_: app (as a product name), daemon, bot

**Inbox**:
The Operator's Gmail Inbox. The only mailbox the CLI reads.
_Avoid_: All Mail, label (as the source)

**Unread Message**:
A message in the Inbox that Gmail still marks unread. The CLI takes up to the 10 newest by received time.
_Avoid_: email (as the type name), mail, letter

**Body**:
The visible text of an Unread Message. Attachments and images are not part of it.
_Avoid_: HTML, MIME part, payload

**Digest**:
The CLI output: one AI summary of the selected Unread Messages (From, Subject, and Body of each), plus a one-line From/Subject for each.
_Avoid_: report, recap, briefing (until we pick a different product name)
