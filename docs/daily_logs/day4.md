## 4-07-2026

* Created the `Post` entity and mapped it to the existing `posts` table.
* Created the `Tag` entity and mapped it to the existing `tags` table.
* Configured the many-to-many relationship between `Post` and `Tag` using the `post_tags` join table.
* Created the `PostRepository` and `TagRepository` with the required query methods.
* Defined DTOs for post creation, post responses, and feed responses.
* Implemented the `PostService` to handle post creation business logic.
* Initialized new posts with `OPEN` status, `createdAt`, and `lockAt = createdAt + 48 hours`.
* Implemented tag normalization, reuse of existing tags, creation of new tags, and post-tag association.
* Enforced post creation rules, including authentication, required image key, optional title, maximum of five tags, and duplicate tag prevention.
* Implemented the `POST /api/posts` endpoint.
* Implemented the `GET /api/posts/open` endpoint with pagination and sorting by nearest lock time.
* Implemented the `GET /api/posts/settled` endpoint with pagination and sorting by most recently settled.
* Configured paginated feed responses using Spring Data pagination.
* Built the Create Post page in the frontend.
* Implemented image preview using the uploaded S3 object.
* Added title input and tag management with a maximum of five unique tags.
* Integrated the frontend with the post creation and feed APIs.
* Built the Open Feed page displaying image, title, poster, tags, and remaining settlement time.
* Built the Settled Feed page with placeholder support for winning caption information.
* Added navigation between Create Post, Open Feed, and Settled Feed.
* Implemented loading states, submission feedback, error handling, and redirect after successful post creation.
* Configured public image loading from AWS S3 using stored object keys.
* Verified the complete flow: upload image → create post → persist metadata → display post in the Open Feed.
