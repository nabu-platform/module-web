<template id="default-unknown">
	<div class="is-column is-align-center is-spacing-medium is-height-fixed-max">
		<h1 class="is-h1 is-size-xxxlarge">{{$services.page.translate("%{default::That page doesn't exist!}")}}</h1>
		<h6 class="is-h6">{{$services.page.translate(message)}}</h6>
		<p class="is-p is-spacing-vertical-top-large" v-content.compile="$services.page.translate(recover)"></p>
	</div>
</template>