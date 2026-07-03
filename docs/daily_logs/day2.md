## 02-07-2026

* Set up the `User` entity and mapped it to the existing Flyway database schema.
* Created the `UserRepository` with authentication-related query methods.
* Defined authentication DTOs for registration, login, authentication response, and current user information.
* Added request validation using Bean Validation annotations.
* Configured BCrypt password hashing.
* Implemented JWT generation, validation, and claim extraction.
* Integrated Spring Security with stateless JWT authentication.
* Implemented `UserDetails` and `UserDetailsService` for Spring Security.
* Created a JWT authentication filter to authenticate incoming requests.
* Configured Spring Security to protect secured endpoints while allowing public authentication endpoints.
* Implemented the `AuthController` with:

  * `POST /api/auth/register`
  * `POST /api/auth/login`
  * `GET /api/auth/me`
* Added centralized exception handling for authentication and validation errors.
* Built frontend Register and Login pages.
* Created authentication forms with client-side validation.
* Implemented frontend API integration for authentication endpoints.
* Added authentication context and JWT management.
* Configured protected routes and automatic JWT attachment to authenticated requests.
* Configured JWT secret, expiration settings, frontend API base URL, and development CORS.
* Verified the complete authentication flow from registration to authenticated user retrieval.


