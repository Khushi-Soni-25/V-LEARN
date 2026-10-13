(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var vIdInput = document.getElementById("v-id");
  var passwordInput = document.getElementById("password");
  var toggleBtn = document.getElementById("toggle-password");
  var submitBtn = document.getElementById("login-submit");
  var message = document.getElementById("form-message");

  var LOGIN_ENDPOINT = "/api/login/v-id";

  function setMessage(text, state) {
    message.textContent = text || "";
    if (state) {
      message.setAttribute("data-state", state);
    } else {
      message.removeAttribute("data-state");
    }
  }

  toggleBtn.addEventListener("click", function () {
    var isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "Hide" : "Show";
    toggleBtn.setAttribute("aria-pressed", String(isHidden));
    toggleBtn.setAttribute(
      "aria-label",
      isHidden ? "Hide password" : "Show password"
    );
  });

  var forgotPasswordLink = document.getElementById("forgot-password-link");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function () {
      sessionStorage.setItem("vlearn_purpose", "reset");
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setMessage("", null);

    var v_id = vIdInput.value.trim();
    var password = passwordInput.value;

    if (!v_id || !password) {
      setMessage("Please enter both your V-ID and password.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in…";

    fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ v_id: v_id, password: password }),
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            return { ok: response.ok, status: response.status, data: data };
          });
      })
      .then(function (result) {
        if (result.ok && result.data.status === "success") {
          var name =
            result.data.user && result.data.user.name
              ? result.data.user.name
              : "";
          setMessage(
            name ? "Welcome back, " + name + "!" : "Login successful.",
            "success"
          );
        } else if (result.status === 400) {
          setMessage(
            result.data.message || "Please fill in all required fields.",
            "error"
          );
        } else if (result.status === 401) {
          setMessage(
            result.data.message || "Invalid V-ID or password.",
            "error"
          );
        } else {
          setMessage("Something went wrong. Please try again.", "error");
        }
      })
      .catch(function () {
        setMessage(
          "Couldn't reach the server. Please check your connection.",
          "error"
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      });
  });
})();
