<template id="default-login">
	<div class="is-row is-align-center is-height-fixed-max is-fill-normal">
		<n-form ref="form" class="is-form is-width-min-xsmall is-spacing-large is-variant-underline is-color-background is-shadow-xsmall is-border-radius-medium" content-class="is-spacing-gap-large">
			<h1 class="is-h3">{{$services.page.translate("%{default::Login}")}}</h1>
			<n-form-text name="username" v-focus v-timeout:input.form="validate" placeholder="%{default::Username}" v-model="username" :required="true"/>
			<n-form-text name="password" type="password" v-timeout:input.form="validate" placeholder="%{default::Password}" v-model="password" :required="true"/>
			<n-form-switch label="%{default::Remember me}" v-model="remember" />
			<div class="is-row is-align-end">
				<button :disabled="working" class="is-button is-variant-primary" v-action="login">{{$services.page.translate("%{default::Login}")}}</button>
			</div>
			<n-messages v-if="messages.length" :messages="messages"/>
		</n-form>
	</div>
</template>