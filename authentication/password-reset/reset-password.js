(function () {
  "use strict";

  var form = document.getElementById("reset-form");
  var newPasswordInput = document.getElementById("new-password");
  var confirmPasswordInput = document.getElementById("confirm-password");
  var toggleBtn = document.getElementById("toggle-password");
  var submitBtn = document.getElementById("reset-submit");
  var message = document.getElementById("form-message");
  var contextLink = document.getElementById("context-link");

  var CONFIRM_ENDPOINT = "/api/password-reset/confirm";
  var MIN_PASSWORD_LENGTH = 8;

  var phone = sessionStorage.getItem("vlearn_phone");
  var resetToken = sessionStorage.getItem("vlearn_reset_token");

  function setMessage(text, state) {
    message.textContent = text || "";
    if (state) {
      message.setAttribute("data-state", state);
    } else {
      message.removeAttribute("data-state");
    }
  }

  if (!phone || !resetToken) {
    setMessage(
      "Please verify your phone number before setting a new password.",
      "error"
    );
    form.querySelectorAll("input, button").forEach(function (el) {
      el.disabled = true;
    });
    contextLink.innerHTML =
      '<a href="../phone-login/phone-login.html?purpose=reset">Verify your phone number</a>';
  }

  toggleBtn.addEventListener("click", function () {
    var isHidden = newPasswordInput.type === "password";
    newPasswordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "Hide" : "Show";
    toggleBtn.setAttribute("aria-pressed", String(isHidden));
    toggleBtn.setAttribute(
      "aria-label",
      isHidden ? "Hide password" : "Show password"
    );
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!phone || !resetToken) return;
    setMessage("", null);

    var newPassword = newPasswordInput.value;
    var confirmPassword = confirmPasswordInput.value;

    if (!newPassword || !confirmPassword) {
      setMessage("Please fill in both password fields.", "error");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setMessage(
        "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.",
        "error"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Updating…";

    fetch(CONFIRM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone,
        reset_token: resetToken,
        new_password: newPassword,
      }),
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
          sessionStorage.removeItem("vlearn_phone");
          sessionStorage.removeItem("vlearn_purpose");
          sessionStorage.removeItem("vlearn_reset_token");
          setMessage("Password updated. You can now log in.", "success");
          form.querySelectorAll("input, button").forEach(function (el) {
            el.disabled = true;
          });
          contextLink.innerHTML = '<a href="../vid-login/login.html">Go to login</a>';
        } else if (result.status === 401) {
          setMessage(
            result.data.message ||
              "Your session expired. Please verify your phone number again.",
            "error"
          );
          contextLink.innerHTML =
            '<a href="../phone-login/phone-login.html?purpose=reset">Verify your phone number</a>';
        } else if (result.status === 400) {
          setMessage(result.data.message || "Please check your password.", "error");
        } else {
          setMessage("Something went wrong. Please try again.", "error");
        }
      })
      .catch(function () {
        setMessage("Couldn't reach the server. Please check your connection.", "error");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Update password";
      });
  });
})();
