# Gmail API with OAuth for the email summarizer CLI

The CLI must read the Operator's Inbox Unread Messages. IMAP plus an app password was simpler for a test repo; the Operator chose the Gmail REST API and OAuth instead so access is official and read-only via `gmail.readonly`. Refresh tokens live in env, not in git.
