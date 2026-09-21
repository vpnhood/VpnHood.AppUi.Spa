<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { ApiException, SignInState } from '@/services/VpnHood.Client.Api';
import { useDialogFocus } from '@/helpers/InitialFocus';

// The sign-in chooser. The store/IdP method is the PRIMARY everywhere it exists — one prominent
// button — and the portal's own email + password is the secondary path beneath it, for people who
// bought on the account website (sign-in only: the backend never creates an account for it).
// A second factor arrives as a challenge step in here, never as a redirect to a website; the
// account website appears exactly once, as the "forgot password" escape hatch in the browser.
const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
// On a TV the dialog opens with the primary button under the remote.
const { target: focusRef, onAfterEnter } = useDialogFocus();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  // the TV UI's 'Sign in on your phone': the page that mounted this dialog closes it and opens the
  // pairing dialog in its place - both are routed, so the order is the page's to keep
  (e: 'signInOnPhone'): void;
}>();

type Step = 'start' | 'password' | 'challenge' | 'backup-code';
const step = ref<Step>('start');
const email = ref('');
const password = ref('');
const twoFactorCode = ref('');
const newBackupCode = ref('');
const errorMessage = ref('');
const isWorking = ref(false);
const showPassword = ref(false);

// a reopened dialog starts from the beginning, holding no one's credentials. With no identity
// provider to choose, the chooser would be a single button in front of the only form there is, so
// the dialog opens on the form itself.
watch(
  () => props.modelValue,
  () => {
    step.value = vhApp.primaryProviderId() ? 'start' : 'password';
    email.value = '';
    password.value = '';
    twoFactorCode.value = '';
    newBackupCode.value = '';
    errorMessage.value = '';
    showPassword.value = false;
  },
);

const primaryMethod = computed(() => vhApp.primaryProviderId());
// Brand names are not translated, so this is a map rather than locale keys. The fallback
// capitalizes an unknown id so a new provider degrades to something readable, never to a blank.
const primaryProviderName = computed(() => {
  const id = primaryMethod.value;
  if (!id) return '';
  const names: Record<string, string> = { apple: 'Apple', google: 'Google', microsoft: 'Microsoft' };
  return names[id.toLowerCase()] ?? id.charAt(0).toUpperCase() + id.slice(1);
});
const primaryLabelKey = computed(() => {
  if (!primaryMethod.value) return 'SIGN_IN';
  const key = `SIGN_IN_WITH_${primaryMethod.value.toUpperCase()}`;
  return i18n.global.te(key) ? key : 'SIGN_IN';
});
// Google and Apple both REQUIRE their own mark on the sign-in button and forbid recolouring it, so
// the primary button is branded per provider instead of following the app theme. Both brands
// approve their light appearance on a dark surface, which is what this dialog is in either theme.
// Any other provider — Microsoft, or one added later — keeps the app's own button.
const brandButtonStyles: Record<string, Record<string, string>> = {
  google: { backgroundColor: '#FFFFFF', color: '#1F1F1F', border: '1px solid #747775' },
  apple: { backgroundColor: '#FFFFFF', color: '#000000' },
};
const primaryBrand = computed(() => {
  const id = primaryMethod.value?.toLowerCase() ?? '';
  return id in brandButtonStyles ? id : null;
});
const primaryBrandStyle = computed(() =>
  primaryBrand.value ? brandButtonStyles[primaryBrand.value] : undefined);
const hasPasswordMethod = computed(() => vhApp.data.features.authProviderIds.includes('password'));
// On the TV UI the email form is not offered - there is nothing to type on - and the phone stands
// in for it: the pairing dialog, whose paired browser has the same form and the same app behind it.
const isPhoneForEmail = computed(() => vhApp.data.isTvUi && hasPasswordMethod.value);
// The account website is a WEB page, so it needs a browser to LEAVE the app with. Withheld where
// there is none — the link would open nothing — which is asked of the device rather than guessed
// from "is this a TV": a television with a browser installed opens it fine.
const accountWebsiteUrl = computed(() =>
  vhApp.isExternalLinkUsable() ? vhApp.data.features.accountWebsiteUrl : null);

function close(): void {
  emit('update:modelValue', false);
}

// The phone is the TV's keyboard: the pairing dialog takes this one's place, with a hint saying
// where on the phone to go, and it says so itself once the account arrives.
function signInOnPhone(): void {
  emit('signInOnPhone');
}

async function signInWithPrimary(): Promise<void> {
  close();
  await vhApp.signIn();
}

// The portal's machine code (err.data.Code) is the contract; its English detail is the fallback
// for a code this build does not know yet. invalid_credentials deliberately covers unknown email,
// wrong password AND never-set password in ONE message — the API is built so nothing can tell
// those apart (anti-enumeration), so neither can this dialog.
function messageForError(err: unknown): string {
  if (err instanceof ApiException) {
    const code = err.data['Code'];
    switch (code) {
      case 'invalid_credentials':
        return locale('SIGN_IN_INVALID_CREDENTIALS');
      case 'too_many_attempts':
        return locale('SIGN_IN_COOLDOWN');
      case 'invalid_code':
        return locale('SIGN_IN_WRONG_CODE');
      case 'invalid_challenge':
        return locale('SIGN_IN_CHALLENGE_EXPIRED');
      case 'unsupported_two_factor':
        return locale('SIGN_IN_UNSUPPORTED_TWO_FACTOR');
      case 'no_account':
        // with a store provider, say where accounts DO come from — the person holding a wrong
        // email may simply be a store-account holder on the wrong path
        return primaryMethod.value
          ? locale('SIGN_IN_NO_ACCOUNT_WITH_PROVIDER', { provider: primaryProviderName.value })
          : locale('SIGN_IN_NO_ACCOUNT');
      case 'account_ambiguous':
        return locale('SIGN_IN_ACCOUNT_AMBIGUOUS');
    }
  }
  return err instanceof Error ? err.message : String(err);
}

async function submitPassword(): Promise<void> {
  if (!email.value || !password.value) return;
  errorMessage.value = '';
  isWorking.value = true;
  try {
    const result = await vhApp.signInWithPassword(email.value.trim(), password.value);
    if (result.state !== SignInState.SignedIn) {
      // the password is right; nothing is signed in until the second factor answers
      twoFactorCode.value = '';
      step.value = 'challenge';
      return;
    }
    close();
  } catch (err: unknown) {
    errorMessage.value = messageForError(err);
  } finally {
    isWorking.value = false;
  }
}

async function submitChallenge(): Promise<void> {
  if (!twoFactorCode.value) return;
  errorMessage.value = '';
  isWorking.value = true;
  try {
    const result = await vhApp.completeSignInChallenge(twoFactorCode.value.trim());
    if (result.newBackupCode) {
      // the backup code was spent and rotated — this is the ONLY time the new one is shown
      newBackupCode.value = result.newBackupCode;
      step.value = 'backup-code';
      return;
    }
    close();
  } catch (err: unknown) {
    errorMessage.value = messageForError(err);
    // a spent or expired challenge restarts from the password, with the message explaining why
    if (err instanceof ApiException && err.data['Code'] === 'invalid_challenge')
      step.value = 'password';
  } finally {
    isWorking.value = false;
  }
}
</script>

<template>
  <v-dialog
    :modelValue="props.modelValue"
    max-width="420"
    @update:modelValue="close()"
    @after-enter="onAfterEnter"
  >
    <v-card color="general-dialog">
      <!-- Step 1: the chooser — store sign-in above, email beneath -->
      <template v-if="step === 'start'">
        <v-card-title>{{ locale('SIGN_IN') }}</v-card-title>
        <v-card-text class="text-general-dialog-text">
          <!-- The marks may not be recoloured, so the Google G keeps the fills baked into its
               paths and the Apple mark takes the button text colour. -->
          <v-btn
            v-if="primaryMethod"
            ref="focusRef"
            block
            size="large"
            :variant="primaryBrand ? 'flat' : undefined"
            :color="primaryBrand ? undefined : 'highlight'"
            :style="primaryBrandStyle"
            class="text-transform-none"
            :text="locale(primaryLabelKey)"
            @click="signInWithPrimary()"
          >
            <template v-if="primaryBrand" #prepend>
              <v-icon size="18">
                <svg v-if="primaryBrand === 'google'" class="v-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <svg v-else class="v-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                </svg>
              </v-icon>
            </template>
          </v-btn>
          <template v-if="isPhoneForEmail">
            <div v-if="primaryMethod" class="d-flex align-center my-4">
              <v-divider />
              <span class="mx-3 text-disabled text-body-small">{{ locale('OR') }}</span>
              <v-divider />
            </div>
            <v-btn
              block
              variant="outlined"
              size="large"
              class="text-transform-none"
              prepend-icon="mdi-cellphone-arrow-down"
              :text="locale('SIGN_IN_ON_YOUR_PHONE')"
              @click="signInOnPhone()"
            />
          </template>
          <template v-else-if="hasPasswordMethod">
            <div v-if="primaryMethod" class="d-flex align-center my-4">
              <v-divider />
              <span class="mx-3 text-disabled text-body-small">{{ locale('OR') }}</span>
              <v-divider />
            </div>
            <v-btn
              block
              variant="outlined"
              size="large"
              class="text-transform-none"
              prepend-icon="mdi-email-outline"
              :text="locale('SIGN_IN_WITH_EMAIL')"
              @click="step = 'password'"
            />
            <!-- scopes the email path to website accounts BEFORE the tap: an IdP account has no
                 password, and invalid_credentials deliberately cannot say so afterwards -->
            <p class="text-disabled text-body-small text-center mt-2">
              {{ locale('SIGN_IN_EMAIL_SCOPE_HINT') }}
            </p>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-btn :text="locale('CANCEL')" @click="close()" />
        </v-card-actions>
      </template>

      <!-- Step 2: the account website's own email + password -->
      <template v-else-if="step === 'password'">
        <v-card-title>{{ locale('SIGN_IN_WITH_EMAIL') }}</v-card-title>
        <v-card-text class="text-general-dialog-text">
          <p class="text-body-medium" :class="primaryMethod ? 'mb-2' : 'mb-4'">{{ locale('SIGN_IN_WITH_EMAIL_DESC') }}</p>
          <!-- the escape for a store-account holder who wandered in: their account has no
               password, so no amount of typing here can succeed. Meaningless without a store,
               hence gated. -->
          <p v-if="primaryMethod" class="text-disabled text-body-small mb-4">
            {{ locale('SIGN_IN_PROVIDER_HINT', { provider: primaryProviderName }) }}
          </p>
          <v-form @submit.prevent="submitPassword()">
            <v-text-field
              v-model="email"
              :label="locale('EMAIL')"
              type="email"
              autocomplete="email"
              autofocus
              density="comfortable"
            />
            <v-text-field
              v-model="password"
              :label="locale('PASSWORD')"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              density="comfortable"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
            />
            <!-- submit inside the form so Enter works -->
            <v-btn
              block
              color="highlight"
              size="large"
              type="submit"
              :loading="isWorking"
              :disabled="!email || !password"
              :text="locale('SIGN_IN')"
            />
          </v-form>
          <p v-if="errorMessage" class="text-error text-body-medium mt-3">{{ errorMessage }}</p>
          <!-- the one place the account website appears: setting/recovering the password happens
               there — store-created accounts have never set one, and the error message says so -->
          <a
            v-if="accountWebsiteUrl"
            :href="accountWebsiteUrl"
            target="_blank"
            class="d-block mt-4 text-body-small"
          >{{ locale('FORGOT_PASSWORD') }}</a>
        </v-card-text>
        <v-card-actions>
          <!-- nothing to go back TO when the form is the whole dialog -->
          <v-btn v-if="primaryMethod" :text="locale('BACK')" @click="step = 'start'; errorMessage = ''" />
          <v-spacer />
          <v-btn :text="locale('CANCEL')" @click="close()" />
        </v-card-actions>
      </template>

      <!-- Step 3: the second factor, in the app — never a website -->
      <template v-else-if="step === 'challenge'">
        <v-card-title>{{ locale('TWO_FACTOR_TITLE') }}</v-card-title>
        <v-card-text class="text-general-dialog-text">
          <p class="text-body-medium mb-4">{{ locale('TWO_FACTOR_DESC') }}</p>
          <v-form @submit.prevent="submitChallenge()">
            <v-text-field
              v-model="twoFactorCode"
              :label="locale('TWO_FACTOR_CODE')"
              autocomplete="one-time-code"
              inputmode="numeric"
              autofocus
              density="comfortable"
            />
            <v-btn
              block
              color="highlight"
              size="large"
              type="submit"
              :loading="isWorking"
              :disabled="!twoFactorCode"
              :text="locale('CONFIRM')"
            />
          </v-form>
          <p v-if="errorMessage" class="text-error text-body-medium mt-3">{{ errorMessage }}</p>
          <p class="text-disabled text-body-small mt-4">{{ locale('TWO_FACTOR_BACKUP_HINT') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-btn :text="locale('CANCEL')" @click="close()" />
        </v-card-actions>
      </template>

      <!-- Step 4: only after a backup code was spent — its replacement, shown exactly once -->
      <template v-else-if="step === 'backup-code'">
        <v-card-title>{{ locale('NEW_BACKUP_CODE_TITLE') }}</v-card-title>
        <v-card-text class="text-general-dialog-text">
          <p class="text-body-medium">{{ locale('NEW_BACKUP_CODE_DESC') }}</p>
          <p class="text-headline-small text-center font-weight-bold my-4" style="user-select: all">
            {{ newBackupCode }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="highlight"
            :text="locale('I_SAVED_IT')"
            @click="close()"
          />
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>
