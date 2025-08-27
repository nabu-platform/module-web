<template id="default-challenge">
	<div class="is-row is-align-center is-height-fixed-max is-fill-normal">
		<n-form ref="form" class="is-form is-width-min-xsmall is-spacing-large is-variant-underline is-color-background is-shadow-xsmall is-border-radius-medium" content-class="is-spacing-gap-large">
			<h1 class="is-h3">{{$services.page.translate("%{default::Challenge}")}}</h1>
			<n-form-text name="challenge" v-focus v-timeout:input.form="validate" placeholder="%{default::Challenge}" v-model="challenge" :required="true"/>
			<div class="is-row is-align-end">
				<button :disabled="working" class="is-button is-variant-primary" v-action="login">{{$services.page.translate("%{default::Login}")}}</button>
			</div>
			<n-messages v-if="messages.length" :messages="messages"/>
		</n-form>
	</div>
</template>